from app.core.firebase import get_db

UID = "U26LEzVGQ7enZe7UNTmyPzgcd402"

def verify_admin():
    db = get_db()
    ref = db.collection("users").document(UID)
    doc = ref.get()
    
    if doc.exists:
        data = doc.to_dict()
        print(f"✓ User document EXISTS")
        print(f"  Role: {data.get('role')}")
        print(f"  Company: {data.get('company_id')}")
        print(f"  Full data: {data}")
    else:
        print(f"✗ User document DOES NOT EXIST for UID: {UID}")
        print(f"  Creating now...")
        from google.cloud import firestore
        ref.set({
            "email": "hazem@opengate.com",
            "role": "admin",
            "company_id": "OPENGATE_CORP",
            "created_at": firestore.SERVER_TIMESTAMP
        })
        print(f"  Created!")

if __name__ == "__main__":
    verify_admin()
