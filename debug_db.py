import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
from decimal import Decimal

def debug_firestore():
    cred_path = Path("backend/service_account.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    print("--- Collection Stats ---")
    collections = ["accounts", "items", "journal_entries", "warehouses", "stock_ledger"]
    for coll in collections:
        docs = db.collection(coll).get()
        print(f"{coll}: {len(docs)} documents")

    print("\n--- Items Snippet ---")
    items = db.collection("items").limit(5).get()
    for item in items:
        d = item.to_dict()
        print(f"Item: {d.get('name')} | Qty: {d.get('current_qty')} | WAC: {d.get('current_wac')}")

    print("\n--- Accounts Snippet ---")
    accounts = db.collection("accounts").limit(5).get()
    for acc in accounts:
        d = acc.to_dict()
        print(f"Account: {d.get('code')} - {d.get('name')}")

    print("\n--- Latest Journals ---")
    journals = db.collection("journal_entries").order_by("date", direction="DESCENDING").limit(5).get()
    for j in journals:
        d = j.to_dict()
        print(f"Journal: {d.get('number')} | Status: {d.get('status')} | Date: {d.get('date')}")

if __name__ == "__main__":
    debug_firestore()
