import datetime
import csv
import io
from sqlalchemy.orm import Session
from app.database import SessionLocal, Passenger, ScanHistory, FraudAlert, AnalyticsState

# Railway Database MCP Simulator Tools
def db_mcp_get_ticket(ticket_id: str) -> dict:
    """Railway Database MCP tool to fetch passenger and ticket details by ticket ID.
    
    Args:
        ticket_id: The unique ticket identifier (e.g. TKT001).
    
    Returns:
        dict: Ticket and passenger details or an empty dict if not found.
    """
    db = SessionLocal()
    try:
        passenger = db.query(Passenger).filter(Passenger.ticket_id == ticket_id).first()
        if passenger:
            return {
                "found": True,
                "ticket_id": passenger.ticket_id,
                "passenger_name": passenger.passenger_name,
                "age": passenger.age,
                "train_number": passenger.train_number,
                "source_station": passenger.source_station,
                "destination_station": passenger.destination_station,
                "journey_date": passenger.journey_date,
                "qr_code": passenger.qr_code,
                "status": passenger.status,
                "ticket_type": passenger.ticket_type,
                "fare": passenger.fare
            }
        return {"found": False, "error": "Ticket not found"}
    finally:
        db.close()

def db_mcp_get_scan_history(ticket_id: str) -> list[dict]:
    """Railway Database MCP tool to retrieve previous entry logs for a ticket ID.
    
    Args:
        ticket_id: The unique ticket identifier.
        
    Returns:
        list: List of prior scan events.
    """
    db = SessionLocal()
    try:
        scans = db.query(ScanHistory).filter(ScanHistory.ticket_id == ticket_id).order_by(ScanHistory.scan_time.desc()).all()
        return [
            {
                "id": scan.id,
                "ticket_id": scan.ticket_id,
                "scan_time": scan.scan_time.isoformat(),
                "gate_id": scan.gate_id,
                "status": scan.status,
                "failure_reason": scan.failure_reason
            }
            for scan in scans
        ]
    finally:
        db.close()

def db_mcp_log_scan(ticket_id: str, gate_id: str, status: str, failure_reason: str = None) -> bool:
    """Railway Database MCP tool to write a ticket scan event to the system log.
    
    Args:
        ticket_id: The unique ticket identifier.
        gate_id: The station gate ID (e.g. Gate A1).
        status: The validation outcome ('APPROVED' or 'DENIED').
        failure_reason: Explanation if the scan was denied.
        
    Returns:
        bool: True if logged successfully.
    """
    db = SessionLocal()
    try:
        new_scan = ScanHistory(
            ticket_id=ticket_id,
            gate_id=gate_id,
            status=status,
            failure_reason=failure_reason,
            scan_time=datetime.datetime.utcnow()
        )
        db.add(new_scan)
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
    finally:
        db.close()

def db_mcp_create_fraud_alert(ticket_id: str, risk_score: int, risk_level: str, explanation: str) -> int:
    """Railway Database MCP tool to generate and log an AI fraud alert.
    
    Args:
        ticket_id: The unique ticket identifier.
        risk_score: Risk score between 0 and 100.
        risk_level: Risk level (Low, Medium, High, Critical).
        explanation: Natural language explanation of fraud trigger.
        
    Returns:
        int: The alert ID created.
    """
    db = SessionLocal()
    try:
        alert = FraudAlert(
            ticket_id=ticket_id,
            risk_score=risk_score,
            risk_level=risk_level,
            explanation=explanation,
            timestamp=datetime.datetime.utcnow(),
            resolved=False
        )
        db.add(alert)
        db.commit()
        return alert.id
    except Exception:
        db.rollback()
        return -1
    finally:
        db.close()

# Analytics MCP Simulator Tools
def analytics_mcp_get_stats() -> dict:
    """Analytics MCP tool to compile dashboard metrics including total, valid, invalid tickets, and savings.
    
    Returns:
        dict: Overall system statistics.
    """
    db = SessionLocal()
    try:
        total_scans = db.query(ScanHistory).count()
        valid_scans = db.query(ScanHistory).filter(ScanHistory.status == "APPROVED").count()
        invalid_scans = db.query(ScanHistory).filter(ScanHistory.status == "DENIED").count()
        fraud_attempts = db.query(FraudAlert).count()
        
        # Read revenue values
        rev_record = db.query(AnalyticsState).filter(AnalyticsState.key == "revenue_protected").first()
        rev_saved = rev_record.value_float if rev_record else 14850.0

        return {
            "total_tickets": db.query(Passenger).count(),
            "total_scans": total_scans,
            "valid_scans": valid_scans,
            "invalid_scans": invalid_scans,
            "fraud_attempts": fraud_attempts,
            "revenue_saved": rev_saved
        }
    finally:
        db.close()

def analytics_mcp_get_station_stats() -> list[dict]:
    """Analytics MCP tool to retrieve violation counts and congestion levels grouped by railway station.
    
    Returns:
        list: Station violation distribution logs.
    """
    db = SessionLocal()
    try:
        # Query distinct stations from seeded passengers
        station_rows = db.query(Passenger.source_station).distinct().all()
        stations = [r[0] for r in station_rows if r[0]]
        
        results = []
        for station in stations:
            # Count total scans at this station
            total_scans = db.query(ScanHistory).join(
                Passenger, ScanHistory.ticket_id == Passenger.ticket_id
            ).filter(Passenger.source_station == station).count()
            
            # Count denied scans (violations) at this station
            violations = db.query(ScanHistory).join(
                Passenger, ScanHistory.ticket_id == Passenger.ticket_id
            ).filter(Passenger.source_station == station, ScanHistory.status == "DENIED").count()
            
            # Calculate dynamic risk multiplier: base is 1.0, increase by ratio of violations
            risk_multiplier = 1.0
            if total_scans > 0:
                risk_multiplier = round(1.0 + (violations / total_scans), 2)
            
            # Calculate recommended inspectors: base 1, plus 1 for every 3 violations
            inspections_recommended = max(1, 1 + (violations // 3))
            
            results.append({
                "station": station,
                "violations": violations,
                "risk_multiplier": risk_multiplier,
                "inspections_recommended": inspections_recommended
            })
            
        # Sort stations by violations count (descending)
        results.sort(key=lambda x: x["violations"], reverse=True)
        return results
    finally:
        db.close()

def analytics_mcp_update_financials(is_valid: bool, ticket_fare: float) -> dict:
    """Analytics MCP tool to update cumulative revenue saved or fraud prevented.
    
    Args:
        is_valid: Whether the ticket scan was verified successfully.
        ticket_fare: The cost value of the ticket being checked.
        
    Returns:
        dict: The updated revenue counters.
    """
    db = SessionLocal()
    try:
        rev_record = db.query(AnalyticsState).filter(AnalyticsState.key == "revenue_protected").first()
        if not rev_record:
            rev_record = AnalyticsState(key="revenue_protected", value_float=0.0)
            db.add(rev_record)
            
        if is_valid:
            # Valid scan adds standard ticket price to the database metrics
            rev_record.value_float += ticket_fare
        else:
            # Prevented fraud adds double the fare value (estimated penalty + ticket loss saved)
            rev_record.value_float += (ticket_fare * 1.5)
            
        db.commit()
        return {"status": "success", "revenue_saved": rev_record.value_float}
    except Exception:
        db.rollback()
        return {"status": "error"}
    finally:
        db.close()

# Reporting MCP Simulator Tools
def reporting_mcp_generate_csv() -> str:
    """Reporting MCP tool to compile scan logs and export them as a CSV string.
    
    Returns:
        str: Comma-separated value logs.
    """
    db = SessionLocal()
    try:
        scans = db.query(ScanHistory).order_by(ScanHistory.scan_time.desc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Scan ID", "Ticket ID", "Timestamp", "Gate ID", "Status", "Failure Reason"])
        
        for scan in scans:
            writer.writerow([
                scan.id,
                scan.ticket_id,
                scan.scan_time.strftime("%Y-%m-%d %H:%M:%S"),
                scan.gate_id,
                scan.status,
                scan.failure_reason or "N/A"
            ])
            
        return output.getvalue()
    finally:
        db.close()

def reporting_mcp_generate_pdf_mock(ticket_id: str) -> dict:
    """Reporting MCP tool to create a digital invoice document summary.
    
    Args:
        ticket_id: The unique ticket identifier.
        
    Returns:
        dict: PDF layout specifications.
    """
    db = SessionLocal()
    try:
        passenger = db.query(Passenger).filter(Passenger.ticket_id == ticket_id).first()
        if not passenger:
            return {"error": "Ticket not found"}
            
        return {
            "document_title": "AI Revenue Protection Report",
            "generation_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "ticket_id": ticket_id,
            "passenger": passenger.passenger_name,
            "train": passenger.train_number,
            "route": f"{passenger.source_station} -> {passenger.destination_station}",
            "fare": passenger.fare,
            "status": passenger.status,
            "pdf_base64_mock": "JVBERi0xLjQKJdPr6gogMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAvUGFnZXMgMiAwIFIKICBfPgplbmRvYmo..."
        }
    finally:
        db.close()
