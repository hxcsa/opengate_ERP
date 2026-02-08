import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

def verify_seeding():
    backend_dir = Path("backend")
    cred_path = backend_dir / "service_account.json"
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    item_count = len(db.collection("items").get())
    je_count = len(db.collection("journal_entries").get())
    wh_count = len(db.collection("warehouses").get())
    
    print(f"📊 Seeding Verification:")
    print(f"Items: {item_count} (Expected > 50)")
    print(f"Journal Entries: {je_count} (Expected > 500)")
    print(f"Warehouses: {wh_count} (Expected 3)")
    
    if item_count >= 50 and je_count >= 500 and wh_count >= 3:
        print("✅ System successfully filled!")
    else:
        print("❌ Seeding density check failed.")

if __name__ == "__main__":
    verify_seeding()
