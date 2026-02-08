import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

def get_account_ids():
    cred_path = Path("backend/service_account.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    accounts = db.collection("accounts").get()
    
    mapping = {}
    for acc in accounts:
        d = acc.to_dict()
        mapping[d.get("code")] = acc.id
    return mapping

def repair_db():
    cred_path = Path("backend/service_account.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    acc_map = get_account_ids()
    
    inv_acc_id = acc_map.get("121")
    cogs_acc_id = acc_map.get("51")
    rev_acc_id = acc_map.get("41")
    
    if not all([inv_acc_id, cogs_acc_id, rev_acc_id]):
        print(f"Error: Could not find all required accounts. 121: {inv_acc_id}, 51: {cogs_acc_id}, 41: {rev_acc_id}")
        return

    items = db.collection("items").get()
    for item in items:
        print(f"Repairing item: {item.id}")
        db.collection("items").document(item.id).update({
            "inventory_account_id": inv_acc_id,
            "cogs_account_id": cogs_acc_id,
            "revenue_account_id": rev_acc_id,
            "current_qty": "0.0000",
            "total_value": "0.0000",
            "current_wac": "0.0000"
        })
    print("Repair complete.")

if __name__ == "__main__":
    repair_db()
