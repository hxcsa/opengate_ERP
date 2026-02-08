from google.cloud import firestore
from app.core.firebase import get_db

UID = "mJSssJZbSahL0Gl7HKYS5C1rpUz2"
EMAIL = "hazem@opengate.com"

def restore_admin():
    db = get_db()
    print(f"Restoring admin for {EMAIL} ({UID})...")
    
    ref = db.collection("users").document(UID)
    doc = ref.get()
    
    if doc.exists:
        print("User profile exists. Updating role...")
        ref.update({"role": "admin"})
    else:
        print("User profile MISSING. Creating new admin profile...")
        ref.set({
            "email": EMAIL,
            "role": "admin",
            "company_id": "OPENGATE_CORP", # Default company ID
            "created_at": firestore.SERVER_TIMESTAMP
        })
        
    print("Done! User is now ADMIN.")

if __name__ == "__main__":
    restore_admin()
