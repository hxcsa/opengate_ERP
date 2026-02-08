import os
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.firebase import get_db

def list_admins():
    db = get_db()
    # Query for all users with admin role
    users_ref = db.collection('users')
    query = users_ref.where('role', '==', 'admin').stream()
    
    admins = []
    for doc in query:
        data = doc.to_dict()
        admins.append({
            'uid': doc.id,
            'email': data.get('email', 'N/A'),
            'role': data.get('role')
        })
    
    if not admins:
        print("No admin users found in the database.")
    else:
        print("Admin users found:")
        for admin in admins:
            print(f"- Email: {admin['email']} (UID: {admin['uid']})")

if __name__ == "__main__":
    list_admins()
