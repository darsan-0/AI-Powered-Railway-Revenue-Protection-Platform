import os
import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker

# Define database location
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "railway.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Passenger(Base):
    __tablename__ = "passengers"

    ticket_id = Column(String, primary_key=True, index=True)
    passenger_name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    train_number = Column(String, nullable=False)
    source_station = Column(String, nullable=False)
    destination_station = Column(String, nullable=False)
    journey_date = Column(String, nullable=False) # Store as YYYY-MM-DD
    qr_code = Column(String, nullable=False)
    status = Column(String, nullable=False) # ACTIVE, CANCELLED
    ticket_type = Column(String, nullable=False) # Sleeper, AC 3 Tier, AC 2 Tier, General, Executive
    fare = Column(Float, nullable=False)

class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(String, nullable=False)
    scan_time = Column(DateTime, default=datetime.datetime.utcnow)
    gate_id = Column(String, nullable=False)
    status = Column(String, nullable=False) # APPROVED, DENIED
    failure_reason = Column(String, nullable=True)

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(String, nullable=False)
    risk_score = Column(Integer, nullable=False) # 0-100
    risk_level = Column(String, nullable=False) # Low, Medium, High, Critical
    explanation = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    resolved = Column(Boolean, default=False)

class AnalyticsState(Base):
    __tablename__ = "analytics_state"

    key = Column(String, primary_key=True, index=True)
    value_float = Column(Float, default=0.0)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if database is already seeded
        if db.query(Passenger).count() == 0:
            seed_data(db)
    finally:
        db.close()

def seed_data(db):
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)
    two_days_ago = today - datetime.timedelta(days=2)
    tomorrow = today + datetime.timedelta(days=1)

    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = yesterday.strftime("%Y-%m-%d")
    two_days_ago_str = two_days_ago.strftime("%Y-%m-%d")
    tomorrow_str = tomorrow.strftime("%Y-%m-%d")

    passengers = [
        # Active Normal Tickets
        Passenger(
            ticket_id="TKT001",
            passenger_name="Rahul Kumar",
            age=21,
            train_number="12728",
            source_station="Vijayawada",
            destination_station="Gudivada",
            journey_date=today_str,
            qr_code="TKT001|Rahul Kumar|12728|Vijayawada|Gudivada",
            status="ACTIVE",
            ticket_type="General",
            fare=120.0
        ),
        Passenger(
            ticket_id="TKT002",
            passenger_name="Priya Sharma",
            age=19,
            train_number="17201",
            source_station="Gudivada",
            destination_station="Machilipatnam",
            journey_date=today_str,
            qr_code="TKT002|Priya Sharma|17201|Gudivada|Machilipatnam",
            status="ACTIVE",
            ticket_type="AC 3 Tier",
            fare=550.0
        ),
        Passenger(
            ticket_id="TKT003",
            passenger_name="Vikram Singh",
            age=34,
            train_number="12626",
            source_station="New Delhi",
            destination_station="Agra Cantt",
            journey_date=today_str,
            qr_code="TKT003|Vikram Singh|12626|New Delhi|Agra Cantt",
            status="ACTIVE",
            ticket_type="Sleeper",
            fare=250.0
        ),
        Passenger(
            ticket_id="TKT004",
            passenger_name="Amit Patel",
            age=45,
            train_number="12952",
            source_station="Mumbai Central",
            destination_station="New Delhi",
            journey_date=today_str,
            qr_code="TKT004|Amit Patel|12952|Mumbai Central|New Delhi",
            status="ACTIVE",
            ticket_type="AC 2 Tier",
            fare=2100.0
        ),
        Passenger(
            ticket_id="TKT005",
            passenger_name="Sunita Devi",
            age=50,
            train_number="12301",
            source_station="Howrah",
            destination_station="New Delhi",
            journey_date=today_str,
            qr_code="TKT005|Sunita Devi|12301|Howrah|New Delhi",
            status="ACTIVE",
            ticket_type="AC 3 Tier",
            fare=1850.0
        ),
        # Expired Tickets
        Passenger(
            ticket_id="TKT006",
            passenger_name="Arjun Reddy",
            age=22,
            train_number="17015",
            source_station="Vijayawada",
            destination_station="Hyderabad",
            journey_date=two_days_ago_str,
            qr_code="TKT006|Arjun Reddy|17015|Vijayawada|Hyderabad",
            status="ACTIVE",
            ticket_type="Sleeper",
            fare=380.0
        ),
        Passenger(
            ticket_id="TKT007",
            passenger_name="Sneha Rao",
            age=29,
            train_number="12759",
            source_station="Chennai Central",
            destination_station="Vijayawada",
            journey_date=yesterday_str,
            qr_code="TKT007|Sneha Rao|12759|Chennai Central|Vijayawada",
            status="ACTIVE",
            ticket_type="AC 3 Tier",
            fare=800.0
        ),
        # Cancelled Tickets
        Passenger(
            ticket_id="TKT008",
            passenger_name="Ramesh Babu",
            age=62,
            train_number="12727",
            source_station="Secunderabad",
            destination_station="Visakhapatnam",
            journey_date=today_str,
            qr_code="TKT008|Ramesh Babu|12727|Secunderabad|Visakhapatnam",
            status="CANCELLED",
            ticket_type="AC 2 Tier",
            fare=1400.0
        ),
        Passenger(
            ticket_id="TKT009",
            passenger_name="Divya Nair",
            age=27,
            train_number="16346",
            source_station="Thiruvananthapuram",
            destination_station="Mumbai",
            journey_date=today_str,
            qr_code="TKT009|Divya Nair|16346|Thiruvananthapuram|Mumbai",
            status="CANCELLED",
            ticket_type="Sleeper",
            fare=650.0
        ),
        # Duplicate Scan Simulation Target
        Passenger(
            ticket_id="TKT010",
            passenger_name="Rajesh Verma",
            age=31,
            train_number="12002",
            source_station="New Delhi",
            destination_station="Bhopal",
            journey_date=today_str,
            qr_code="TKT010|Rajesh Verma|12002|New Delhi|Bhopal",
            status="ACTIVE",
            ticket_type="AC Chair Car",
            fare=850.0
        ),
        Passenger(
            ticket_id="TKT011",
            passenger_name="Kavita Joshi",
            age=28,
            train_number="12951",
            source_station="Mumbai Central",
            destination_station="New Delhi",
            journey_date=today_str,
            qr_code="TKT011|Kavita Joshi|12951|Mumbai Central|New Delhi",
            status="ACTIVE",
            ticket_type="AC 3 Tier",
            fare=1950.0
        ),
        # Route Violation Target
        Passenger(
            ticket_id="TKT012",
            passenger_name="Sandeep Gupta",
            age=35,
            train_number="12615",
            source_station="Chennai Central",
            destination_station="New Delhi",
            journey_date=today_str,
            qr_code="TKT012|Sandeep Gupta|12615|Chennai Central|New Delhi",
            status="ACTIVE",
            ticket_type="Sleeper",
            fare=710.0
        ),
        # Active normal tickets (various stations)
        Passenger(
            ticket_id="TKT013",
            passenger_name="Nisha Patel",
            age=24,
            train_number="12002",
            source_station="New Delhi",
            destination_station="Agra Cantt",
            journey_date=today_str,
            qr_code="TKT013|Nisha Patel|12002|New Delhi|Agra Cantt",
            status="ACTIVE",
            ticket_type="AC Chair Car",
            fare=450.0
        ),
        Passenger(
            ticket_id="TKT014",
            passenger_name="Gopal Rao",
            age=58,
            train_number="12728",
            source_station="Vijayawada",
            destination_station="Visakhapatnam",
            journey_date=today_str,
            qr_code="TKT014|Gopal Rao|12728|Vijayawada|Visakhapatnam",
            status="ACTIVE",
            ticket_type="AC 3 Tier",
            fare=620.0
        ),
        Passenger(
            ticket_id="TKT015",
            passenger_name="Ananya Mishra",
            age=22,
            train_number="12301",
            source_station="Howrah",
            destination_station="Asansol",
            journey_date=today_str,
            qr_code="TKT015|Ananya Mishra|12301|Howrah|Asansol",
            status="ACTIVE",
            ticket_type="AC 2 Tier",
            fare=980.0
        ),
        Passenger(
            ticket_id="TKT016",
            passenger_name="Deepak Choudhury",
            age=39,
            train_number="12841",
            source_station="Howrah",
            destination_station="Chennai Central",
            journey_date=tomorrow_str,
            qr_code="TKT016|Deepak Choudhury|12841|Howrah|Chennai Central",
            status="ACTIVE",
            ticket_type="Sleeper",
            fare=690.0
        ),
        Passenger(
            ticket_id="TKT017",
            passenger_name="Sanjay Dutt",
            age=43,
            train_number="12952",
            source_station="Ratlam",
            destination_station="New Delhi",
            journey_date=today_str,
            qr_code="TKT017|Sanjay Dutt|12952|Ratlam|New Delhi",
            status="ACTIVE",
            ticket_type="AC 3 Tier",
            fare=1150.0
        ),
        Passenger(
            ticket_id="TKT018",
            passenger_name="Meera Sen",
            age=67,
            train_number="12302",
            source_station="New Delhi",
            destination_station="Howrah",
            journey_date=today_str,
            qr_code="TKT018|Meera Sen|12302|New Delhi|Howrah",
            status="ACTIVE",
            ticket_type="First Class AC",
            fare=4200.0
        ),
        Passenger(
            ticket_id="TKT019",
            passenger_name="Karthik Swamy",
            age=30,
            train_number="12626",
            source_station="Bhopal",
            destination_station="Chennai Central",
            journey_date=today_str,
            qr_code="TKT019|Karthik Swamy|12626|Bhopal|Chennai Central",
            status="ACTIVE",
            ticket_type="Sleeper",
            fare=580.0
        ),
        Passenger(
            ticket_id="TKT020",
            passenger_name="Harpreet Kaur",
            age=26,
            train_number="12001",
            source_station="Bhopal",
            destination_station="New Delhi",
            journey_date=today_str,
            qr_code="TKT020|Harpreet Kaur|12001|Bhopal|New Delhi",
            status="ACTIVE",
            ticket_type="AC Chair Car",
            fare=890.0
        )
    ]
    
    db.add_all(passengers)
    
    # Seed a rich validation scan history and AI fraud alerts spanning the last 5 days
    histories = []
    alerts = []
    
    for day_offset in range(4, -1, -1):
        scan_date = today - datetime.timedelta(days=day_offset)
        # Create different number of scans for each day to show a natural variance trend
        num_scans = 8 + (4 - day_offset) * 2  # 8, 10, 12, 14, 16 scans
        
        for i in range(num_scans):
            # Spread scan times across the day (between 8 AM and 8 PM)
            hour = 8 + (i * 12 // num_scans)
            minute = (i * 17) % 60
            scan_time = datetime.datetime.combine(scan_date, datetime.time(hour, minute))
            
            # Select ticket ID from TKT001 to TKT005 (valid active tickets) or others
            tkt_num = 1 + (i % 5)
            ticket_id = f"TKT{tkt_num:03d}"
            
            # Introduce a denied ticket scan occasionally to generate realistic fraud metrics
            is_denied = (i % 8 == 0)
            if is_denied:
                if i % 3 == 0:
                    t_id = "TKT006" # Expired
                    reason = "Expired Ticket"
                    explanation = f"Ticket {t_id} is expired (journey date: {two_days_ago_str}). System blocked access attempt."
                    risk_score = 75
                    risk_level = "High"
                elif i % 3 == 1:
                    t_id = "TKT008" # Cancelled
                    reason = "Cancelled Ticket"
                    explanation = f"Ticket {t_id} was officially CANCELLED. System blocked gate entry attempt."
                    risk_score = 90
                    risk_level = "Critical"
                else:
                    t_id = "TKT010" # Duplicate Scan
                    reason = "Duplicate Ticket Usage"
                    explanation = f"Ticket {t_id} was scanned again within 30 minutes. Suspected ticket-sharing fraud."
                    risk_score = 95
                    risk_level = "Critical"
                
                histories.append(ScanHistory(
                    ticket_id=t_id,
                    scan_time=scan_time,
                    gate_id=f"Gate {chr(65 + (i % 3))}{1 + (i % 4)}",
                    status="DENIED",
                    failure_reason=reason
                ))
                
                alerts.append(FraudAlert(
                    ticket_id=t_id,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    explanation=explanation,
                    timestamp=scan_time,
                    resolved=(day_offset > 0) # Mark past alerts resolved, keep today's alerts active
                ))
            else:
                histories.append(ScanHistory(
                    ticket_id=ticket_id,
                    scan_time=scan_time,
                    gate_id=f"Gate {chr(65 + (i % 3))}{1 + (i % 4)}",
                    status="APPROVED"
                ))
                
    db.add_all(histories)
    db.add_all(alerts)
    db.commit()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
