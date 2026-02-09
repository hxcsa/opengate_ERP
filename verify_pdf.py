import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.services.pdf import PDFService

def test_pdf():
    service = PDFService()
    
    # Mock Sales Order data
    data = {
        "id": "SO-TEST-001",
        "customer_name": "Test Customer",
        "lines": [
            {"item_name": "Test Item 1", "quantity": "2", "unit_price": "100.50"},
            {"item_name": "Test Item 2", "quantity": "1", "unit_price": "50.00"}
        ],
        "created_by_email": "admin@example.com"
    }
    
    try:
        pdf_bytes = service.generate_invoice(data, type="SALES INVOICE")
        print(f"Success! Generated {len(pdf_bytes)} bytes.")
        with open("test_invoice.pdf", "wb") as f:
            f.write(pdf_bytes)
        print("Written to test_invoice.pdf")
    except Exception as e:
        print(f"Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf()
