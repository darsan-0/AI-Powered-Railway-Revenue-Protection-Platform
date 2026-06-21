import os
import logging
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

# Configure python logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to load GCP logging, fallback to standard python logging if not authenticated
try:
    import google.auth
    from google.cloud import logging as google_cloud_logging
    _, project_id = google.auth.default()
    logging_client = google_cloud_logging.Client()
    class GoogleCloudLogger:
        def __init__(self, name):
            self.cloud_logger = logging_client.logger(name)
        def log_struct(self, data, severity="INFO"):
            try:
                self.cloud_logger.log_struct(data, severity=severity)
            except Exception:
                logger.info(f"Local Log [{severity}]: {data}")
    logger_wrapper = GoogleCloudLogger(__name__)
except Exception:
    class LocalLogger:
        def log_struct(self, data, severity="INFO"):
            logger.info(f"Local Log [{severity}]: {data}")
    logger_wrapper = LocalLogger()
    project_id = "local-project"

# Import database models and initialization
from app.database import init_db, SessionLocal, Passenger, ScanHistory, FraudAlert, seed_data
from app.agents import run_validation_simulation
from app.mcp_tools import (
    analytics_mcp_get_stats,
    analytics_mcp_get_station_stats,
    reporting_mcp_generate_csv,
    reporting_mcp_generate_pdf_mock
)
from app.generate_qrs import generate_all_qrs

# Initialize SQLite database schema and seed data
try:
    init_db()
    generate_all_qrs()
    logger.info("SQLite Database initialized, seeded, and QR codes generated successfully.")
except Exception as e:
    logger.error(f"Error initializing SQLite database: {e}")

# Pydantic schemas for requests
class ValidateRequest(BaseModel):
    ticket_id: str
    gate_id: str = "Gate A1"

class LoginRequest(BaseModel):
    email: str
    password: str

class Feedback(BaseModel):
    session_id: str
    rating: Optional[int] = None
    comment: Optional[str] = None
    score: Optional[int] = None
    user_id: Optional[str] = None
    text: Optional[str] = None

# Configure CORS for frontend access
allow_origins_env = os.getenv("ALLOW_ORIGINS", "*")
if not allow_origins_env.strip():
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in allow_origins_env.split(",") if o.strip()]

# Always ensure standard local development origins are allowed to prevent CORS and origin check middleware failures
dev_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
for origin in dev_origins:
    if origin not in allow_origins:
        allow_origins.append(origin)

# Create FastAPI app using ADK CLI helper
from google.adk.cli.fast_api import get_fast_api_app
agents_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = get_fast_api_app(
    agents_dir=agents_dir,
    web=False,
    allow_origins=allow_origins
)

# Remove ADK's custom OriginCheckMiddleware to prevent "Forbidden: origin not allowed" errors in local development
app.user_middleware = [
    m for m in app.user_middleware 
    if m.cls.__name__ != "_OriginCheckMiddleware"
]

app.title = "AI-Powered Railway Revenue Protection Platform API"
app.description = "Multi-Agent system API for ticket verification, fraud detection, and revenue analytics."
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "project_id": project_id}

@app.get("/api/passengers")
def get_passengers():
    db = SessionLocal()
    try:
        passengers = db.query(Passenger).all()
        return passengers
    finally:
        db.close()

@app.get("/api/passengers/{ticket_id}")
def get_passenger_detail(ticket_id: str):
    db = SessionLocal()
    try:
        passenger = db.query(Passenger).filter(Passenger.ticket_id == ticket_id).first()
        if not passenger:
            raise HTTPException(status_code=404, detail="Passenger/Ticket not found")
        return passenger
    finally:
        db.close()

@app.post("/api/validate")
def validate_ticket(request: ValidateRequest):
    try:
        # Pass raw ticket_id string (which can be a full QR payload) directly to the validation engine
        result = run_validation_simulation(request.ticket_id, request.gate_id)
        
        # Log feedback metadata
        logger_wrapper.log_struct({
            "event": "ticket_validation",
            "ticket_id": result.get("ticket_id", request.ticket_id),
            "gate_id": request.gate_id,
            "decision": result["final_decision"],
            "passenger": result.get("passenger_name")
        }, severity="INFO")
        
        return result
    except Exception as e:
        logger.error(f"Error in ticket validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts")
def get_alerts():
    db = SessionLocal()
    try:
        alerts = db.query(FraudAlert).order_by(FraudAlert.timestamp.desc()).all()
        return alerts
    finally:
        db.close()

@app.post("/api/alerts/resolve/{alert_id}")
def resolve_alert(alert_id: int):
    db = SessionLocal()
    try:
        alert = db.query(FraudAlert).filter(FraudAlert.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        alert.resolved = True
        db.commit()
        return {"status": "success", "message": f"Alert {alert_id} resolved."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/api/analytics")
def get_analytics():
    try:
        stats = analytics_mcp_get_stats()
        stations = analytics_mcp_get_station_stats()
        
        # Aggregate daily validation history counts for Recharts
        db = SessionLocal()
        try:
            # Calculate real financial metrics
            approved_scans = db.query(ScanHistory).filter(ScanHistory.status == "APPROVED").all()
            real_rev_saved = 0.0
            for s in approved_scans:
                p = db.query(Passenger).filter(Passenger.ticket_id == s.ticket_id).first()
                if p:
                    real_rev_saved += p.fare
                    
            denied_scans = db.query(ScanHistory).filter(ScanHistory.status == "DENIED").all()
            real_rev_leakage = 0.0
            for s in denied_scans:
                p = db.query(Passenger).filter(Passenger.ticket_id == s.ticket_id).first()
                if p:
                    real_rev_leakage += p.fare * 1.5
                    
            # Override stats.revenue_saved and add revenue_leakage_prevented
            stats["revenue_saved"] = real_rev_saved
            stats["revenue_leakage_prevented"] = real_rev_leakage
            
            history = db.query(ScanHistory).order_by(ScanHistory.scan_time.asc()).all()
            
            # Group scans by day
            daily_scans = {}
            for h in history:
                day_str = h.scan_time.strftime("%m-%d")
                if day_str not in daily_scans:
                    daily_scans[day_str] = {"date": day_str, "valid": 0, "invalid": 0, "total": 0}
                daily_scans[day_str]["total"] += 1
                if h.status == "APPROVED":
                    daily_scans[day_str]["valid"] += 1
                else:
                    daily_scans[day_str]["invalid"] += 1
            
            daily_list = list(daily_scans.values())
            daily_list.sort(key=lambda x: x["date"])

            # Calculate violation distribution dynamically from SQLite ScanHistory
            violations = {
                "Duplicate scan": 0,
                "Expired date": 0,
                "Cancelled ticket": 0,
                "Invalid ID": 0
            }
            for s in denied_scans:
                reason = s.failure_reason or "Other"
                if "Duplicate" in reason:
                    violations["Duplicate scan"] += 1
                elif "Expired" in reason:
                    violations["Expired date"] += 1
                elif "Cancelled" in reason:
                    violations["Cancelled ticket"] += 1
                else:
                    violations["Invalid ID"] += 1
            
            violation_list = []
            for k, v in violations.items():
                violation_list.append({"name": k, "value": v})
        finally:
            db.close()

        return {
            "stats": stats,
            "stations": stations,
            "daily_validations": daily_list,
            "violation_distribution": violation_list
        }
    except Exception as e:
        logger.error(f"Error compiling analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def get_history():
    db = SessionLocal()
    try:
        scans = db.query(ScanHistory).order_by(ScanHistory.scan_time.desc()).all()
        # Join passenger details if present
        results = []
        for s in scans:
            p = db.query(Passenger).filter(Passenger.ticket_id == s.ticket_id).first()
            results.append({
                "id": s.id,
                "ticket_id": s.ticket_id,
                "scan_time": s.scan_time.isoformat(),
                "gate_id": s.gate_id,
                "status": s.status,
                "failure_reason": s.failure_reason,
                "passenger_name": p.passenger_name if p else "Unknown Passenger",
                "route": f"{p.source_station} -> {p.destination_station}" if p else "N/A"
            })
        return results
    finally:
        db.close()

@app.post("/api/reset")
def reset_database():
    db = SessionLocal()
    try:
        from app.database import AnalyticsState
        # Drop and recreate tables to seed fresh
        db.query(ScanHistory).delete()
        db.query(FraudAlert).delete()
        db.query(Passenger).delete()
        db.query(AnalyticsState).delete()
        db.commit()
        seed_data(db)
        # Regenerate QR codes on reset
        generate_all_qrs()
        return {"status": "success", "message": "Database reset to original seed state and QR codes regenerated."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.get("/api/export")
def export_csv():
    try:
        csv_data = reporting_mcp_generate_csv()
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=railway_scan_report.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
def login(request: LoginRequest):
    if request.email == "admin@railway.com" and request.password == "password123":
        return {
            "status": "success",
            "token": "mock-jwt-admin-token-983172",
            "user": {
                "name": "Superintendent Inspector",
                "email": "admin@railway.com",
                "role": "Chief Revenue Protection Officer"
            }
        }
    raise HTTPException(status_code=401, detail="Invalid railway credentials")

@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    logger_wrapper.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
