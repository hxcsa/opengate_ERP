"""
Seeding Script for Default Users & Roles
Provides ready-to-use accounts for testing RBAC (Admin, Accountant, Storekeeper).
"""
import firebase_admin
from firebase_admin import auth, firestore
from app.core.firebase import get_db, init_firebase

def seed_users():
    # Ensure Firebase is initialized
    init_firebase()
    db = get_db()
    
    # Default Company ID for testing
    COMPANY_ID = "opengate_hq_001"
    DEFAULT_PASSWORD = "Password123!"
    
    users_to_seed = [
        {
            "email": "admin@opengate.com",
            "role": "admin",
            "name": "Head Office Admin"
        },
        {
            "email": "accountant@opengate.com",
            "role": "accountant",
            "name": "Senior Accountant"
        },
        {
            "email": "storekeeper@opengate.com",
            "role": "storekeeper",
            "name": "Warehouse Manager"
        }
    ]
    
    print(f"🚀 Seeding {len(users_to_seed)} users...")
    
    for user_info in users_to_seed:
        try:
            # 1. Check if user exists in Firebase Auth
            try:
                user = auth.get_user_by_email(user_info["email"])
                print(f"ℹ️ User {user_info['email']} already exists in Auth. Updating Firestore profile...")
                uid = user.uid
            except auth.UserNotFoundError:
                # 2. Create in Firebase Auth
                user = auth.create_user(
                    email=user_info["email"],
                    password=DEFAULT_PASSWORD,
                    display_name=user_info["name"]
                )
                print(f"✅ Created Auth user: {user_info['email']}")
                uid = user.uid
            
            # 3. Create/Update profile in Firestore
            user_data = {
                "email": user_info["email"],
                "role": user_info["role"],
                "company_id": COMPANY_ID,
                "name": user_info["name"],
                "created_at": firestore.SERVER_TIMESTAMP,
                "status": "active"
            }
            db.collection("users").document(uid).set(user_data, merge=True)
            print(f"✅ Synced Firestore profile for: {user_info['role']}")
            
        except Exception as e:
            print(f"❌ Error seeding {user_info['email']}: {e}")

    print("\n--- Seeding Complete ---")
    print(f"Standard Password for all: {DEFAULT_PASSWORD}")
    print("1. admin@opengate.com (Full Access)")
    print("2. accountant@opengate.com (Finance & Inventory)")
    print("3. storekeeper@opengate.com (Inventory Only)")

if __name__ == "__main__":
    seed_users()
