import os
import sys

# Get absolute path to backend
base_dir = r"c:\Users\razer\OneDrive\Desktop\ERP"
backend_dir = os.path.join(base_dir, "backend")
sys.path.append(backend_dir)

import firebase_admin
from firebase_admin import auth, firestore, credentials

# Initialize if needed
if not firebase_admin._apps:
    cred_path = os.path.join(backend_dir, "service_account.json")
    print(f"Loading creds from: {cred_path}")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def force_reconcile_admins():
    print("🚀 Forcing Reconciliation of Admin Roles...")
    
    # These are the emails we want as admins
    admin_emails = [
        "hazem@opengate.com",
        "admin@opengate.com"
    ]
    
    for email in admin_emails:
        print(f"\nChecking: {email}")
        try:
            user = auth.get_user_by_email(email)
            uid = user.uid
            print(f"✅ Auth UID: {uid}")
            
            user_ref = db.collection('users').document(uid)
            user_ref.set({
                "email": email,
                "role": "admin",
                "company_id": "OPENGATE_CORP", 
                "status": "active",
                "reconciled_at": firestore.SERVER_TIMESTAMP
            }, merge=True)
            print(f"🚀 SUCCESS: {email} is now ADMIN in Firestore (UID: {uid})")
            
        except auth.UserNotFoundError:
            print(f"ℹ️ User {email} not found in Auth.")
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    force_reconcile_admins()
