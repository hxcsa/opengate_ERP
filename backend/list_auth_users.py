from firebase_admin import auth
from app.core.firebase import get_db

def list_auth_users():
    db = get_db() # Init app
    pager = auth.list_users()
    print(f"{'UID':<30} | {'Email':<30}")
    print("-" * 65)
    for user in pager.users:
        print(f"{user.uid:<30} | {user.email:<30}")
        
if __name__ == "__main__":
    list_auth_users()
