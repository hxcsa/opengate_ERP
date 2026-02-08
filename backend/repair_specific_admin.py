
import firebase_admin
from firebase_admin import auth, firestore, credentials
import os

# Initialize Firebase if not already initialized
if not firebase_admin._apps:
    cred_path = os.path.join(os.getcwd(), "backend", "service_account.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

def repair_admin_user(email):
    print(f"🔧 Repairing Admin User: {email}")
    
    try:
        # 1. Get UID from Auth
        user = auth.get_user_by_email(email)
        uid = user.uid
        print(f"✅ Found User UID: {uid}")
        
        # 2. Force Update Firestore Profile
        user_ref = db.collection("users").document(uid)
        
        # Check if exists first
        doc = user_ref.get()
        if doc.exists:
            print(f"📝 Profile exists. Current Role: {doc.to_dict().get('role')}")
        else:
            print("⚠️ Profile MISSING. Creating new...")
            
        update_data = {
            "email": email,
            "role": "admin",
            "company_id": "opengate_hq_001",
            "name": email.split("@")[0],
            "status": "active",
            "repaired_at": firestore.SERVER_TIMESTAMP
        }
        
        user_ref.set(update_data, merge=True)
        print("🚀 SUCCESS: User promoted to ADMIN with Company ID: opengate_hq_001")
        
    except auth.UserNotFoundError:
        print(f"❌ User {email} not found in Firebase Auth.")
        print("Creating user now...")
        user = auth.create_user(email=email, password="password123")
        repair_admin_user(email) # Recursively call to set profile
        
    except Exception as e:
        print(f"🔥 ERROR: {e}")

if __name__ == "__main__":
    repair_admin_user("admin@opengate.com")
