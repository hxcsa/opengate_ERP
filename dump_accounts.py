"""Dump raw Firestore document data for accounts to a file."""
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

def dump_accounts():
    cred_path = Path("backend/service_account.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    docs = db.collection("accounts").where("company_id", "==", "opengate_hq_001").stream()
    
    with open("dump_output.txt", "w", encoding="utf-8") as f:
        for doc in docs:
            data = doc.to_dict()
            f.write(f"Doc ID: {doc.id}\n")
            for key, val in sorted(data.items()):
                f.write(f"  {key}: {repr(val)}\n")
            f.write("-" * 40 + "\n")
    
    print("Done. Check dump_output.txt")

if __name__ == "__main__":
    dump_accounts()
