import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

def inspect_items():
    cred_path = Path("backend/service_account.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    items = db.collection("items").get()
    
    print(f"Total Items: {len(items)}")
    for item in items:
        d = item.to_dict()
        print(f"--- Item: {d.get('name')} ({item.id}) ---")
        print(f"  Qty: {d.get('current_qty')}")
        print(f"  WAC: {d.get('current_wac')}")
        print(f"  Inventory Acc: {d.get('inventory_account_id')}")
        print(f"  COGS Acc: {d.get('cogs_account_id')}")
        print(f"  Revenue Acc: {d.get('revenue_account_id')}")
        print(f"  Fields: {list(d.keys())}")

    # Also check if accounts exist for those IDs
    print("\n--- Account Check ---")
    acc_ids = set()
    for item in items:
        d = item.to_dict()
        if d.get('inventory_account_id'): acc_ids.add(d['inventory_account_id'])
    
    for aid in acc_ids:
        doc = db.collection("accounts").document(aid).get()
        print(f"Account {aid} exists: {doc.exists}")

if __name__ == "__main__":
    inspect_items()
