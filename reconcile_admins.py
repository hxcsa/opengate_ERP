import os
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import firebase_admin
from firebase_admin import auth, firestore, credentials

# Initialize if needed
if not firebase_admin._apps:
    cred_path = os.path.join(os.getcwd(), "backend", "service_account.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def force_reconcile_admins():
    print("🚀 Forcing Reconciliation of Admin Roles...")
    
    # 1. List of emails that definitely SHOULD be admins
    admin_emails = [
        "hazem@opengate.com",
        "admin@opengate.com",
        "razer@opengate.com"
    ]
    
    for email in admin_emails:
        print(f"\nChecking: {email}")
        try:
            # Get Auth User
            user = auth.get_user_by_email(email)
            uid = user.uid
            print(f"✅ Auth UID: {uid}")
            
            # Reconcile Firestore
            user_ref = db.collection('users').document(uid)
            doc = user_ref.get()
            
            data = {
                "email": email,
                "role": "admin",
                "company_id": "opengate_hq_001", # Unified company ID
                "status": "active",
                "reconciled_at": firestore.SERVER_TIMESTAMP
            }
            
            if doc.exists:
                current = doc.to_dict()
                if current.get('role') != 'admin':
                    print(f"⚠️ Updating role from '{current.get('role')}' to 'admin'")
                else:
                    print("✓ Already admin in Firestore")
                user_ref.update({"role": "admin", "reconciled_at": firestore.SERVER_TIMESTAMP})
            else:
                print("📝 Firestore record MISSING. Creating now...")
                user_ref.set(data)
                
            print(f"🚀 DONE: {email} is fully verified as ADMIN")
            
        except auth.UserNotFoundError:
            print(f"ℹ️ User {email} not found in Firebase Auth. Skipping.")
        except Exception as e:
            print(f"❌ Error with {email}: {e}")

if __name__ == "__main__":
    force_reconcile_admins()
