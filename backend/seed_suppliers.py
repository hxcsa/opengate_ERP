from google.cloud import firestore
import firebase_admin
from firebase_admin import credentials, firestore as admin_firestore

# Initialize Firebase
cred_path = r"c:\Users\razer\OneDrive\Desktop\ERP\backend\service_account.json"
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = admin_firestore.client()

def seed_suppliers():
    suppliers = [
        {
            "name": "Global Foods Ltd",
            "contact_person": "John Doe",
            "email": "john@globalfoods.com",
            "phone": "+964 770 123 4567",
            "company_id": "opengate_hq_001"
        },
        {
            "name": "Al-Mansour Distribution",
            "contact_person": "Ahmed Hassan",
            "email": "ahmed@almansour.com",
            "phone": "+964 780 987 6543",
            "company_id": "opengate_hq_001"
        }
    ]
    
    for s in suppliers:
        doc_ref = db.collection("suppliers").document()
        doc_ref.set(s)
        print(f"Created supplier: {s['name']} (ID: {doc_ref.id})")

if __name__ == "__main__":
    seed_suppliers()
