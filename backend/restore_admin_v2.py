from google.cloud import firestore
from app.core.firebase import get_db

UID = "U26LEzVGQ7enZe7UNTmyPzgcd402"  # The UID from the user's logs
EMAIL = "hazem@opengate.com" # Assuming this is the email, or we just patch the UID

def restore_admin_correct_uid():
    db = get_db()
    print(f"Restoring admin for UID: {UID}...")
    
    ref = db.collection("users").document(UID)
    
    # Force set/update
    ref.set({
        "role": "admin",
        "company_id": "OPENGATE_CORP", 
        "updated_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
        
    print(f"Done! User {UID} is now ADMIN.")

if __name__ == "__main__":
    restore_admin_correct_uid()
