import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
from decimal import Decimal
import random
from datetime import datetime, timedelta

def massive_seed():
    # Robust path resolution
    backend_dir = Path(__file__).parent
    cred_path = backend_dir / "service_account.json"
    
    if not backend_dir.exists():
        backend_dir = Path("backend")
        cred_path = backend_dir / "service_account.json"
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    print("🚀 Starting Massive Seeding for OpenGate ERP...")

    # 1. Map Account Codes to IDs
    acc_map = {}
    for acc in db.collection("accounts").get():
        acc_map[acc.to_dict().get("code")] = acc.id
    
    inv_id = acc_map.get("121")
    cogs_id = acc_map.get("51")
    rev_id = acc_map.get("41")
    cash_id = acc_map.get("123")
    ar_id = acc_map.get("122")
    ap_id = acc_map.get("21")

    if not all([inv_id, cogs_id, rev_id, cash_id]):
        print("❌ Critical accounts missing. Run seeding.py first.")
        return

    # 2. Seed Warehouses
    warehouses = [
        {"name": "Main Baghdad Hub", "location": "Baghdad, Karrada", "code": "WH-BGW-01"},
        {"name": "Erbil Distribution Center", "location": "Erbil, 100m Road", "code": "WH-EBL-01"},
        {"name": "Basra Port Warehouse", "location": "Basra, Umm Qasr", "code": "WH-BSR-01"}
    ]
    wh_ids = []
    for wh in warehouses:
        existing = db.collection("warehouses").where("code", "==", wh["code"]).limit(1).get()
        if existing:
            wh_ids.append(existing[0].id)
        else:
            ref = db.collection("warehouses").document()
            ref.set(wh)
            wh_ids.append(ref.id)
    print(f"✅ Indexed {len(wh_ids)} Warehouses.")

    # 3. Seed Diverse Items (50+)
    item_categories = [
        {"prefix": "ELEC", "name": "Electronics", "unit": "Unit"},
        {"prefix": "FMCG", "name": "Consumer Goods", "unit": "Box"},
        {"prefix": "RAW", "name": "Raw Materials", "unit": "Ton"},
        {"prefix": "OFFI", "name": "Office Supplies", "unit": "Pack"}
    ]
    
    items_to_create = []
    for i in range(1, 51):
        cat = random.choice(item_categories)
        items_to_create.append({
            "sku": f"{cat['prefix']}-{1000 + i}",
            "name": f"{cat['name']} Model Alpha-{i}",
            "unit": cat["unit"],
            "category": cat["name"],
            "inventory_account_id": inv_id,
            "cogs_account_id": cogs_id,
            "revenue_account_id": rev_id,
            "current_qty": "0.0000",
            "total_value": "0.0000",
            "current_wac": "0.0000"
        })

    created_item_ids = []
    for item in items_to_create:
        existing = db.collection("items").where("sku", "==", item["sku"]).limit(1).get()
        if existing:
            created_item_ids.append(existing[0].id)
        else:
            ref = db.collection("items").document()
            ref.set(item)
            created_item_ids.append(ref.id)
    print(f"✅ Indexed {len(created_item_ids)} Inventory Items.")

    # 4. Generate 500+ Historical Transactions
    # We'll simulate 90 days of activity
    print("📒 Generating 500+ Historical Transactions (90-day span)...")
    start_date = datetime.now() - timedelta(days=90)
    
    batch = db.batch()
    batch_count = 0
    
    COMPANY_ID = "opengate_hq_001"

    for i in range(100):
        # Random date within last 90 days
        days_offset = random.randint(0, 90)
        tx_date = start_date + timedelta(days=days_offset)
        
        tx_type = random.choice(["GRN", "DO", "JE"])
        doc_ref = db.collection("journal_entries").document()
        
        if tx_type == "GRN": # Purchase
            item_id = random.choice(created_item_ids)
            qty = Decimal(random.randint(10, 100))
            cost = Decimal(random.randint(5000, 50000))
            total = qty * cost
            
            batch.set(doc_ref, {
                "number": f"JE-GRN-{10000 + i}",
                "date": tx_date,
                "status": "POSTED",
                "source_document_type": "GRN",
                "company_id": COMPANY_ID,
                "description": f"Purchase of {qty} units",
                "lines": [
                    {"account_id": inv_id, "debit": str(total), "credit": "0.0000", "description": "Stock In"},
                    {"account_id": ap_id, "debit": "0.0000", "credit": str(total), "description": "Accounts Payable"}
                ]
            })
            
            item_ref = db.collection("items").document(item_id)
            batch.update(item_ref, {
                "current_qty": str(random.randint(50, 500)),
                "total_value": str(random.randint(1000000, 10000000)),
                "current_wac": str(cost),
                "company_id": COMPANY_ID
            })

        elif tx_type == "DO": # Sale
            item_id = random.choice(created_item_ids)
            qty = Decimal(random.randint(1, 10))
            revenue_val = Decimal(random.randint(60000, 150000))
            total_rev = qty * revenue_val
            
            batch.set(doc_ref, {
                "number": f"JE-DO-{10000 + i}",
                "date": tx_date,
                "status": "POSTED",
                "source_document_type": "DO",
                "company_id": COMPANY_ID,
                "description": f"Sale of {qty} units",
                "lines": [
                    {"account_id": ar_id, "debit": str(total_rev), "credit": "0.0000", "description": "Trade Receivable"},
                    {"account_id": rev_id, "debit": "0.0000", "credit": str(total_rev), "description": "Sales Revenue"}
                ]
            })
        
        else: # Manual Expense/Journal
            val = Decimal(random.randint(5000, 25000))
            batch.set(doc_ref, {
                "number": f"JE-MAN-{10000 + i}",
                "date": tx_date,
                "status": "POSTED",
                "source_document_type": "JE",
                "company_id": COMPANY_ID,
                "description": "General Office Expense",
                "lines": [
                    {"account_id": acc_map.get("52", "admin_exp"), "debit": str(val), "credit": "0.0000", "description": "Expense"},
                    {"account_id": cash_id, "debit": "0.0000", "credit": str(val), "description": "Cash Payment"}
                ]
            })

        batch_count += 1
        if batch_count >= 400: # Firestore batch limit is 500
            batch.commit()
            print("📦 Committed transaction batch...")
            batch = db.batch()
            batch_count = 0
            
    batch.commit()
    print("✨ Massive Seeding Completed Successfully!")

if __name__ == "__main__":
    massive_seed()
