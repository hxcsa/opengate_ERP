from app.core.firebase import get_db
from google.cloud import firestore

def debug_data():
    db = get_db()
    
    # 1. Check Journals
    journals = list(db.collection("journal_entries").stream())
    posted_journals = [j for j in journals if j.to_dict().get("status") == "POSTED"]
    print(f"Total Journals: {len(journals)}")
    print(f"Posted Journals: {len(posted_journals)}")
    
    if posted_journals:
        print("Sample Posted Journal Lines:", posted_journals[0].to_dict().get("lines"))
    
    # 2. Check Items
    items = list(db.collection("items").stream())
    print(f"Total Items: {len(items)}")
    for item in items[:3]:
        d = item.to_dict()
        print(f"Item: {d.get('name')}, Qty: {d.get('current_qty')}")
        
    # 3. Check Accounts
    accounts = list(db.collection("accounts").stream())
    print(f"Total Accounts: {len(accounts)}")
    
    # 4. Check Users
    users = list(db.collection("users").stream())
    print(f"Total Users: {len(users)}")
    for u in users:
        d = u.to_dict()
        print(f"User: {d.get('email')}, Role: {d.get('role')}, ID: {u.id}")

if __name__ == "__main__":
    debug_data()
