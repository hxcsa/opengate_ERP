import firebase_admin
from firebase_admin import auth, credentials, firestore
import os
import json

from pathlib import Path

# Initialize Firebase Admin
if not firebase_admin._apps:
    backend_dir = Path(__file__).parent
    cred_path = backend_dir / "service_account.json"
    
    if cred_path.exists():
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    else:
        raise FileNotFoundError(f"Credentials not found at {cred_path}")

# Use the firestore client from the initialized app
db = firestore.client()

def set_user_custom_claims(uid: str, role: str, company_id: str):
    """Sets custom claims for a user to optimize security rules and auth logic."""
    try:
        auth.set_custom_user_claims(uid, {
            "role": role,
            "company_id": company_id
        })
        print(f"Successfully set claims for user {uid}: role={role}, company_id={company_id}")
    except Exception as e:
        print(f"Error setting claims for user {uid}: {e}")

def sync_all_users():
    """Reads users from Firestore and sets custom claims in Firebase Auth."""
    users_ref = db.collection("users").stream()
    for user in users_ref:
        data = user.to_dict()
        uid = user.id
        role = data.get("role", "viewer")
        company_id = data.get("company_id")
        
        if not company_id:
            print(f"Skipping user {uid}: missing company_id")
            continue
            
        set_user_custom_claims(uid, role, company_id)

if __name__ == "__main__":
    print("Starting Custom Claims Synchronization...")
    sync_all_users()
    print("Finished.")
