import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
from decimal import Decimal

def repair_db():
    cred_path = Path("backend/service_account.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # 1. Map codes to IDs
    acc_map = {}
    for acc in db.collection("accounts").get():
        acc_map[acc.to_dict().get("code")] = acc.id
    
    inv_id = acc_map.get("121")
    cogs_id = acc_map.get("51")
    rev_id = acc_map.get("41")
    
    print(f"Target IDs - Inv: {inv_id}, COGS: {cogs_id}, Rev: {rev_id}")
    
    if not all([inv_id, cogs_id, rev_id]):
        print("Required accounts missing. Aborting.")
        return

    # 2. Update Items
    items = db.collection("items").get()
    for item in items:
        print(f"Updating item {item.id}...")
        db.collection("items").document(item.id).update({
            "inventory_account_id": inv_id,
            "cogs_account_id": cogs_id,
            "revenue_account_id": rev_id,
            "current_qty": "0.0000",
            "total_value": "0.0000",
            "current_wac": "0.0000"
        })
    
    # 3. Mark all Draft journals as POSTED if they are balanced (for demo purposes)
    journals = db.collection("journal_entries").where("status", "==", "DRAFT").get()
    for j in journals:
        d = j.to_dict()
        debits = sum(Decimal(l.get("debit", "0")) for l in d.get("lines", []))
        credits = sum(Decimal(l.get("credit", "0")) for l in d.get("lines", []))
        if abs(debits - credits) < 0.001:
            print(f"Posting balanced journal {j.id}")
            db.collection("journal_entries").document(j.id).update({"status": "POSTED"})

    print("Repair finished.")

if __name__ == "__main__":
    repair_db()
