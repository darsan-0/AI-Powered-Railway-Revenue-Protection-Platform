import os
import zipfile
import qrcode
from app.database import SessionLocal, Passenger

def generate_all_qrs():
    # Define directories
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    qr_dir = os.path.join(base_dir, "frontend", "public", "qr_tickets")
    
    # Create the directory if it does not exist
    os.makedirs(qr_dir, exist_ok=True)
    
    db = SessionLocal()
    try:
        passengers = db.query(Passenger).all()
        if not passengers:
            print("No passengers found in database to generate QR codes. Run database seed first.")
            return

        print(f"Generating {len(passengers)} QR ticket images inside {qr_dir}...")
        
        # Paths to add to the zip file
        generated_files = []

        for p in passengers:
            # The QR code data is the ticket_id or the structured string
            qr_data = p.qr_code
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_data)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")
            
            # Save PNG image file
            filename = f"{p.ticket_id}.png"
            filepath = os.path.join(qr_dir, filename)
            img.save(filepath)
            generated_files.append((filepath, filename))
            print(f"Generated QR Code for ticket: {p.ticket_id} -> {filepath}")
            
        # Compile all generated PNG files into a single ZIP file
        zip_path = os.path.join(qr_dir, "all_tickets.zip")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for filepath, filename in generated_files:
                zipf.write(filepath, arcname=filename)
                
        print(f"ZIP package created successfully at: {zip_path}")
        
    finally:
        db.close()

if __name__ == "__main__":
    generate_all_qrs()
