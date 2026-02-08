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

def get_all_users():
    print("Fetching Users from Firebase Auth and Firestore...")
    page = auth.list_users()
    
    users = []
    while page:
        for user in page.users:
            # Check Firestore for role
            doc = db.collection('users').document(user.uid).get()
            role = "N/A"
            if doc.exists:
                role = doc.to_dict().get('role', 'N/A')
            
            users.append({
                'email': user.email,
                'uid': user.uid,
                'role': role
            })
        page = page.get_next_page()
    
    print("\nAll System Users:")
    for u in users:
        print(f"- {u['email']} (Role: {u['role']})")

if __name__ == "__main__":
    get_all_users()
