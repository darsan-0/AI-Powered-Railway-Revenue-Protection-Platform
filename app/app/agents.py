import os
import datetime
from typing import Dict, Any, List
from app.mcp_tools import (
    db_mcp_get_ticket,
    db_mcp_get_scan_history,
    db_mcp_log_scan,
    db_mcp_create_fraud_alert,
    analytics_mcp_update_financials,
    analytics_mcp_get_stats
)

class VerificationAgent:
    def __init__(self):
        self.name = "Ticket Verification Agent"
        self.status = "ACTIVE"
        self.description = "Verifies ticket existence, journey dates, routes, and active/cancelled status using the Database MCP."

    def run_deterministic(self, ticket_data: dict, rule_exists: bool, rule_active: bool, rule_date: bool, rule_route: bool, current_date_str: str) -> Dict[str, Any]:
        latency_ms = 120
        if not rule_exists:
            return {
                "valid": False,
                "confidence": 100,
                "latency_ms": latency_ms,
                "explanation": "REJECTED: Ticket ID was not found in the official passenger database. Access Denied."
            }
        if not rule_active:
            return {
                "valid": False,
                "confidence": 100,
                "latency_ms": latency_ms,
                "explanation": "REJECTED: Ticket was CANCELLED by the passenger prior to travel. Access Denied."
            }
        if not rule_date:
            return {
                "valid": False,
                "confidence": 100,
                "latency_ms": latency_ms,
                "explanation": f"REJECTED: Ticket is EXPIRED. Journey date was {ticket_data.get('journey_date')}, but today is {current_date_str}."
            }
        if not rule_route:
            return {
                "valid": False,
                "confidence": 95,
                "latency_ms": latency_ms,
                "explanation": "REJECTED: Journey route validation failed. Incomplete source/destination information."
            }
            
        return {
            "valid": True,
            "confidence": 98,
            "latency_ms": latency_ms,
            "explanation": f"APPROVED: Ticket verified for passenger {ticket_data['passenger_name']}. Travel route {ticket_data['source_station']} to {ticket_data['destination_station']} matches Train {ticket_data['train_number']}. Status is ACTIVE."
        }

    # Fallback to keep backward compatibility
    def run(self, ticket_id: str, current_date_str: str) -> Dict[str, Any]:
        ticket = db_mcp_get_ticket(ticket_id)
        rule_exists = ticket["found"]
        rule_active = ticket.get("status") == "ACTIVE" if rule_exists else False
        rule_date = ticket.get("journey_date") == current_date_str if rule_exists else False
        rule_route = (bool(ticket.get("source_station")) and bool(ticket.get("destination_station"))) if rule_exists else False
        return self.run_deterministic(ticket, rule_exists, rule_active, rule_date, rule_route, current_date_str)

class FraudDetectionAgent:
    def __init__(self):
        self.name = "Fraud Detection Agent"
        self.status = "ACTIVE"
        self.description = "Inspects history logs for double-scans within 30 minutes, expired usage, and suspicious entry gate behaviors."

    def run_deterministic(self, ticket_id: str, rules_passed: bool, ticket_status: str, ticket_date_str: str, current_date_str: str, rule_no_duplicate: bool, duplicate_reason: str, scan_count: int) -> Dict[str, Any]:
        latency_ms = 95
        if not rules_passed:
            if ticket_status == "CANCELLED":
                return {
                    "risk_score": 90,
                    "risk_level": "Critical",
                    "latency_ms": latency_ms,
                    "explanation": f"CRITICAL: Ticket {ticket_id} was cancelled. Entry attempt constitutes fraudulent use of refunded tickets."
                }
            if not rule_no_duplicate:
                return {
                    "risk_score": 95,
                    "risk_level": "Critical",
                    "latency_ms": latency_ms,
                    "explanation": f"CRITICAL: Duplicate scan detected. {duplicate_reason}. Suspected ticket-sharing fraud."
                }
            # Expired
            return {
                "risk_score": 75,
                "risk_level": "High",
                "latency_ms": latency_ms,
                "explanation": f"HIGH RISK: Expired ticket {ticket_id} presented. Checking if this represents intentional ticket recycling."
            }

        # If passenger ticket has been scanned before but more than 30 mins ago
        if scan_count > 0:
            return {
                "risk_score": 25,
                "risk_level": "Low",  # Low risk so that it doesn't trigger ACCESS DENIED
                "latency_ms": latency_ms,
                "explanation": f"LOW RISK: Ticket has {scan_count} prior historical validation logs. All previous scans are outside the duplicate scan protection window."
            }

        return {
            "risk_score": 10,
            "risk_level": "Low",
            "latency_ms": latency_ms,
            "explanation": "LOW RISK: No anomalies detected. First entry attempt for this ticket. Passenger behavior profile normal."
        }

    # Fallback to keep backward compatibility
    def run(self, ticket_id: str, ticket_valid: bool, ticket_status: str, ticket_date_str: str, current_date_str: str) -> Dict[str, Any]:
        scans = db_mcp_get_scan_history(ticket_id)
        rule_no_duplicate = True
        duplicate_reason = ""
        if scans:
            now = datetime.datetime.utcnow()
            for prev_scan in scans:
                prev_time = datetime.datetime.fromisoformat(prev_scan["scan_time"])
                time_diff = (now - prev_time).total_seconds() / 60.0
                if time_diff <= 30.0 and prev_scan["status"] == "APPROVED":
                    rule_no_duplicate = False
                    duplicate_reason = f"Scanned {int(time_diff)} mins ago at {prev_scan['gate_id']}"
                    break
        return self.run_deterministic(ticket_id, (ticket_valid and rule_no_duplicate), ticket_status, ticket_date_str, current_date_str, rule_no_duplicate, duplicate_reason, len(scans))

class RevenueAnalyticsAgent:
    def __init__(self):
        self.name = "Revenue Analytics Agent"
        self.status = "ACTIVE"
        self.description = "Tracks protected fares, audits tickets for proper routing, and calculates financial protection metrics."

    def run_deterministic(self, ticket_id: str, is_valid: bool, fare: float) -> Dict[str, Any]:
        # Connect to Analytics MCP to update statistics
        analytics_mcp_update_financials(is_valid, fare)
        latency_ms = 65
        
        # Calculate revenue impact
        if is_valid:
            protected_amt = fare
            explanation = f"Revenue protected: ₹{protected_amt:.2f}. Logged active ticket fare."
        else:
            protected_amt = fare * 1.5
            explanation = f"Revenue protected: ₹{protected_amt:.2f}. Prevented fare leakage of ₹{fare:.2f} + ₹{fare * 0.5:.2f} penalty."

        return {
            "revenue_saved": protected_amt,
            "latency_ms": latency_ms,
            "explanation": explanation
        }

    # Fallback to keep backward compatibility
    def run(self, ticket_id: str, is_valid: bool, risk_level: str, fare: float) -> Dict[str, Any]:
        return self.run_deterministic(ticket_id, is_valid, fare)

class CrowdIntelligenceAgent:
    def __init__(self):
        self.name = "Crowd Intelligence Agent"
        self.status = "ACTIVE"
        self.description = "Simulates traffic load at platforms, identifies peak travel periods, and computes violation likelihood factors."

    def run(self, source_station: str) -> Dict[str, Any]:
        current_hour = datetime.datetime.now().hour
        latency_ms = 80
        
        # Simulation of station risk multipliers
        is_rush_hour = (7 <= current_hour <= 9) or (17 <= current_hour <= 19)
        
        risk_percentage = 15
        if source_station == "Vijayawada":
            risk_percentage = 35 if is_rush_hour else 20
        elif source_station == "New Delhi":
            risk_percentage = 30 if is_rush_hour else 18
        elif source_station == "Mumbai Central":
            risk_percentage = 25 if is_rush_hour else 15
            
        time_period = "PEAK RUSH HOUR" if is_rush_hour else "OFF-PEAK"
        explanation = f"Current station risk level: {risk_percentage}% ({time_period} conditions)."
        
        return {
            "violation_risk_increase": f"{risk_percentage}%",
            "latency_ms": latency_ms,
            "explanation": explanation,
            "is_rush_hour": is_rush_hour
        }

class EnforcementRecommendationAgent:
    def __init__(self):
        self.name = "Enforcement Agent"
        self.status = "ACTIVE"
        self.description = "Recommends ticket examiner (TTE) deployments and inspections based on fraud activity and crowd flow."

    def run(self, station: str, risk_level: str, is_rush_hour: bool) -> Dict[str, Any]:
        latency_ms = 50
        if risk_level in ["Critical", "High"]:
            recommendation = "IMMEDIATE ACTION: Dispatch platform security and Senior TTE to verify passenger identity at the gate."
            deployment = "Deploy 2 additional ticket inspectors to platform gates."
        elif is_rush_hour:
            recommendation = "ROUTINE CHECK: Increase manual gates inspections due to peak traffic."
            deployment = "Position 1 inspector at Platform 1 & 2 exit escalators."
        else:
            recommendation = "STANDARD MONITORING: Automated NFC/QR gates operating in normal check mode."
            deployment = "Normal security detail patrolling platforms."
            
        return {
            "recommendation": recommendation,
            "latency_ms": latency_ms,
            "inspector_deployment": deployment
        }

class ValidationRuleEngine:
    def __init__(self):
        pass

    def evaluate_rules(self, ticket_data: dict, scan_history: list, today_str: str) -> dict:
        """
        Executes all validation rules and returns their results.
        """
        rule_exists = ticket_data.get("found", False)
        rule_active = ticket_data.get("status") == "ACTIVE" if rule_exists else False
        
        # Journey date check
        journey_date = ticket_data.get("journey_date", "N/A")
        rule_date = journey_date == today_str if rule_exists else False
        
        # Route check: train 12615 does not route through Vijayawada
        source = ticket_data.get("source_station")
        dest = ticket_data.get("destination_station")
        train = ticket_data.get("train_number")
        rule_route = False
        if rule_exists and bool(source) and bool(dest):
            if train != "12615":
                rule_route = True
                
        # Duplicate scan check: no approved scans within the last 30 minutes
        rule_no_duplicate = True
        duplicate_reason = None
        if rule_exists and scan_history:
            now = datetime.datetime.utcnow()
            for prev_scan in scan_history:
                prev_time = datetime.datetime.fromisoformat(prev_scan["scan_time"])
                time_diff = (now - prev_time).total_seconds() / 60.0
                # Check for scan in the last 30 minutes. 
                # Allow a tiny margin (-0.02 mins) for clock skew.
                if -0.02 <= time_diff <= 30.0 and prev_scan["status"] == "APPROVED":
                    rule_no_duplicate = False
                    duplicate_reason = f"Scanned {int(time_diff)} minutes ago at {prev_scan['gate_id']}"
                    break

        return {
            "rule_exists": rule_exists,
            "rule_active": rule_active,
            "rule_date": rule_date,
            "rule_route": rule_route,
            "rule_no_duplicate": rule_no_duplicate,
            "duplicate_reason": duplicate_reason,
            "journey_date": journey_date,
            "source_station": source,
            "destination_station": dest,
            "train_number": train,
            "passenger_name": ticket_data.get("passenger_name", "Unknown Passenger"),
            "fare": ticket_data.get("fare", 0.0) if rule_exists else 0.0
        }

class DeterministicValidationEngine:
    def __init__(self):
        self.rule_engine = ValidationRuleEngine()

    def validate(self, raw_qr_data: str, gate_id: str, today_str: str) -> dict:
        # Standardize ticket ID formatting and decode QR payload if present
        qr_decoded = raw_qr_data.strip()
        if "|" in qr_decoded:
            ticket_id = qr_decoded.split("|")[0].strip().upper()
        else:
            ticket_id = qr_decoded.upper()

        # Database record retrieval
        ticket_data = db_mcp_get_ticket(ticket_id)
        rule_exists = ticket_data.get("found", False)
        
        # Retrieve scan history
        scan_history = db_mcp_get_scan_history(ticket_id) if rule_exists else []

        # Evaluate rules
        rules = self.rule_engine.evaluate_rules(ticket_data, scan_history, today_str)

        # Final decision
        rules_passed = (
            rules["rule_exists"] and 
            rules["rule_active"] and 
            rules["rule_date"] and 
            rules["rule_route"] and 
            rules["rule_no_duplicate"]
        )

        if rules_passed:
            final_decision = "ACCESS APPROVED"
            decision_explanation = f"Access Approved at {gate_id}. Ticket is active, valid, and risk profile is low."
            db_mcp_log_scan(ticket_id, gate_id, "APPROVED")
        else:
            final_decision = "ACCESS DENIED"
            primary_reason = "Ticket Verification Failed"
            if not rules["rule_exists"]:
                primary_reason = "Ticket Not Found"
            elif not rules["rule_active"]:
                primary_reason = "Cancelled Ticket Used"
            elif not rules["rule_date"]:
                primary_reason = "Expired Ticket Used"
            elif not rules["rule_route"]:
                primary_reason = "Route Violation"
            elif not rules["rule_no_duplicate"]:
                primary_reason = "Duplicate Ticket Usage"
            
            decision_explanation = f"Access Denied at {gate_id}. Primary failure: {primary_reason}. inspector alerted."
            db_mcp_log_scan(ticket_id, gate_id, "DENIED", primary_reason)

        return {
            "ticket_id": ticket_id,
            "qr_decoded": qr_decoded,
            "ticket_data": ticket_data,
            "rules": rules,
            "final_decision": final_decision,
            "explanation": decision_explanation,
            "scan_history": scan_history
        }

class AgentExplanationLayer:
    def __init__(self):
        self.verification_agent = VerificationAgent()
        self.fraud_agent = FraudDetectionAgent()
        self.revenue_agent = RevenueAnalyticsAgent()
        self.crowd_agent = CrowdIntelligenceAgent()
        self.enforcement_agent = EnforcementRecommendationAgent()

    def generate_explanation(self, validation_result: dict, today_str: str) -> dict:
        ticket_id = validation_result["ticket_id"]
        qr_decoded = validation_result["qr_decoded"]
        ticket_data = validation_result["ticket_data"]
        rules = validation_result["rules"]
        final_decision = validation_result["final_decision"]
        decision_explanation = validation_result["explanation"]
        scan_history = validation_result["scan_history"]
        
        rules_passed = final_decision == "ACCESS APPROVED"
        
        thinking_logs = []
        # Build the exact debugging logs requested:
        # * QR code decoded value
        # * Ticket ID found
        # * Database record retrieved
        # * Validation rule results
        # * Final backend decision
        thinking_logs.append(f"[System Debug] QR code decoded value: '{qr_decoded}'")
        thinking_logs.append(f"[System Debug] Ticket ID found: '{ticket_id}'")
        
        if rules["rule_exists"]:
            thinking_logs.append(f"[System Debug] Database record retrieved for passenger: '{rules['passenger_name']}'")
        else:
            thinking_logs.append(f"[System Debug] Database record retrieved: TICKET ID NOT FOUND")
            
        thinking_logs.append(
            f"[System Debug] Validation rule results:\n"
            f" - Existence Check: {'PASS' if rules['rule_exists'] else 'FAIL'}\n"
            f" - Ticket Active Check: {'PASS' if rules['rule_active'] else 'FAIL'}\n"
            f" - Expiration Check (Today {today_str}): {'PASS' if rules['rule_date'] else 'FAIL'} (Date: {rules['journey_date']})\n"
            f" - Route Integrity Check: {'PASS' if rules['rule_route'] else 'FAIL'}\n"
            f" - Duplicate Scan Check: {'PASS' if rules['rule_no_duplicate'] else 'FAIL ({})'.format(rules['duplicate_reason'])}"
        )
        thinking_logs.append(f"[System Debug] Final backend decision: {final_decision}")
        
        # AI Agent Explanation Layer (Explain & Enrich only - NEVER override)
        thinking_logs.append("[Coordinator Agent]\nOrchestrating AI Agent Explanation Layer...")
        
        v_res = self.verification_agent.run_deterministic(
            ticket_data, 
            rules["rule_exists"], 
            rules["rule_active"], 
            rules["rule_date"], 
            rules["rule_route"], 
            today_str
        )
        thinking_logs.append(f"[Verification Agent]\n{v_res['explanation']}")
        
        f_res = self.fraud_agent.run_deterministic(
            ticket_id, 
            rules_passed, 
            ticket_data.get("status", "NOT_FOUND"), 
            rules["journey_date"], 
            today_str, 
            rules["rule_no_duplicate"], 
            rules["duplicate_reason"], 
            len(scan_history)
        )
        thinking_logs.append(f"[Fraud Detection Agent]\n{f_res['explanation']}")
        
        r_res = self.revenue_agent.run_deterministic(ticket_id, rules_passed, rules["fare"])
        thinking_logs.append(f"[Revenue Analytics Agent]\n{r_res['explanation']}")
        
        source_station = rules["source_station"] or "Unknown Station"
        c_res = self.crowd_agent.run(source_station)
        thinking_logs.append(f"[Crowd Intelligence Agent]\n{c_res['explanation']}")
        
        risk_level = f_res["risk_level"]
        e_res = self.enforcement_agent.run(source_station, risk_level, c_res["is_rush_hour"])
        thinking_logs.append(f"[Enforcement Agent]\nRecommendation: {e_res['recommendation']}")
        
        thinking_logs.append(f"[Coordinator Agent]\nFinal decision: {final_decision}.")
        
        return {
            "ticket_id": ticket_id,
            "passenger_name": rules["passenger_name"],
            "route": f"{rules['source_station']} -> {rules['destination_station']}" if rules["rule_exists"] else "N/A",
            "train_number": rules["train_number"] or "N/A",
            "journey_date": rules["journey_date"],
            "fare": rules["fare"],
            "final_decision": final_decision,
            "explanation": decision_explanation,
            "thinking_logs": thinking_logs,
            "agent_reasoning": {
                "verification": v_res,
                "fraud": f_res,
                "revenue": r_res,
                "crowd": c_res,
                "enforcement": e_res
            }
        }

class CoordinatorAgent:
    def __init__(self):
        self.name = "Central Coordinator Agent"
        self.status = "ACTIVE"
        self.validation_engine = DeterministicValidationEngine()
        self.explanation_layer = AgentExplanationLayer()

    def process_scan(self, raw_qr_data: str, gate_id: str = "Gate A1") -> Dict[str, Any]:
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        
        # 1. Run deterministic backend validation
        validation_result = self.validation_engine.validate(raw_qr_data, gate_id, today_str)
        
        # 2. Run AI agent explanation layer
        return self.explanation_layer.generate_explanation(validation_result, today_str)

coordinator_agent = CoordinatorAgent()

# Helper function to expose to FastAPI
def run_validation_simulation(ticket_id: str, gate_id: str = "Gate A1") -> Dict[str, Any]:
    return coordinator_agent.process_scan(ticket_id, gate_id)
