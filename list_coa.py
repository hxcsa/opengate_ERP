import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

def list_coa():
    cred_path = Path("backend/service_account.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    accounts = db.collection("accounts").get()
    
    print("--- Detailed COA List ---")
    for acc in accounts:
        d = acc.to_dict()
        print(f"Code: {d.get('code')} | Name: {d.get('name')} | ID: {acc.id}")

if __name__ == "__main__":
    list_coa()
