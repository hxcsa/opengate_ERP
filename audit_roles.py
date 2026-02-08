from app.core.firebase import get_db

def audit_users():
    db = get_db()
    users = db.collection("users").stream()
    print(f"{'UID':<30} | {'Email':<30} | {'Role':<15}")
    print("-" * 80)
    for user in users:
        data = user.to_dict()
        print(f"{user.id:<30} | {data.get('email', 'N/A'):<30} | {data.get('role', 'N/A'):<15}")

if __name__ == "__main__":
    audit_users()
