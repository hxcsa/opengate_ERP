from decimal import Decimal
import random
import traceback
from datetime import datetime, timedelta
from app.core.firebase import get_db
from app.services.seeding import seed_iraqi_coa
from app.services.inventory import InventoryService
from app.services.accounting import AccountingService
from app.schemas.erp import GRNCreate, GRNLine, DeliveryNoteCreate, DeliveryNoteLine, JournalEntryCreate, JournalLineCreate
from google.cloud import firestore

def seed_massive_data():
    db = get_db()
    print("🚀 Starting Massive Data Seeding (200+ Transactions)...")
    
    # 1. Seed COA
    seed_iraqi_coa()
    print("✅ COA Seeded.")

    # 2. Add Warehouses
    warehouses = [
        {"name": "Main Warehouse - Baghdad", "location": "Shorja"},
        {"name": "Erbil Branch", "location": "Azadi"},
        {"name": "Basra Port Storage", "location": "Umm Qasr"},
        {"name": "Mosul Hub", "location": "Al-Muthanna"},
        {"name": "Najaf Distribution", "location": "Old City"}
    ]
    wh_ids = []
    for wh in warehouses:
        doc_ref = db.collection("warehouses").document()
        doc_ref.set(wh)
        wh_ids.append(doc_ref.id)
    print(f"✅ Seeded {len(wh_ids)} warehouses.")

    # 3. Add Items (50+ Items)
    categories = ["Electronics", "Furniture", "Office Supplies", "Mobile", "Laptops"]
    item_ids = []
    
    inv_acc = db.collection("accounts").where("code", "==", "121").limit(1).get()[0].id
    cogs_acc = db.collection("accounts").where("code", "==", "51").limit(1).get()[0].id
    rev_acc = db.collection("accounts").where("code", "==", "41").limit(1).get()[0].id

    for i in range(50):
        cat = random.choice(categories)
        sku = f"{cat[:3].upper()}-{random.randint(1000, 9999)}"
        name = f"{cat} Model {random.choice(['X', 'Pro', 'Ultra', 'Max', 'Plus'])} {random.randint(1, 15)}"
        
        doc_ref = db.collection("items").document()
        it_data = {
            "sku": sku,
            "name": name,
            "unit": random.choice(["Pcs", "Box", "Set"]),
            "category": cat,
            "inventory_account_id": inv_acc,
            "cogs_account_id": cogs_acc,
            "revenue_account_id": rev_acc,
            "current_qty": "0.0000",
            "current_wac": "0.0000",
            "total_value": "0.0000"
        }
        doc_ref.set(it_data)
        item_ids.append(doc_ref.id)
    print(f"✅ Seeded {len(item_ids)} items.")

    # 4. Get Core Accounts
    try:
        supplier_acc_id = db.collection("accounts").where("code", "==", "21").limit(1).get()[0].id
        customer_acc_id = db.collection("accounts").where("code", "==", "11").limit(1).get()[0].id
        cash_acc_id = db.collection("accounts").where("code", "==", "181").limit(1).get()[0].id
        
        rent_snap = db.collection("accounts").where("code", "==", "321").limit(1).get()
        if not rent_snap:
            # Fallback to any expense account if 321 not found
            rent_snap = db.collection("accounts").where("type", "==", "EXPENSE").limit(1).get()
        
        rent_acc_id = rent_snap[0].id
    except Exception as e:
        print(f"⚠️ Warning: Could not find all core accounts: {e}")
        # Create a simple cash account if missing
        doc_ref = db.collection("accounts").document()
        doc_ref.set({"code": "181", "name": "Cash Hand", "type": "ASSET", "is_group": False})
        cash_acc_id = doc_ref.id
        supplier_acc_id = cash_acc_id
        customer_acc_id = cash_acc_id
        rent_acc_id = cash_acc_id

    inv_service = InventoryService()
    acc_service = AccountingService()

    # 5. Seed 50 GRNs (Purchases)
    print("📦 Seeding 50 Purchases (GRN)...")
    for i in range(50):
        try:
            lines = []
            selected_items = random.sample(item_ids, random.randint(1, 5))
            for item_id in selected_items:
                lines.append(GRNLine(
                    item_id=item_id,
                    warehouse_id=random.choice(wh_ids),
                    quantity=str(random.randint(10, 100)),
                    unit_cost=str(random.randint(10000, 500000))
                ))
            grn_data = GRNCreate(
                number=f"GRN-{2024}-{i+1:03d}",
                lines=lines,
                supplier_account_id=supplier_acc_id
            )
            inv_service.create_goods_receipt(grn_data)
        except: pass

    # 6. Seed 100 Delivery Notes (Sales)
    print("💰 Seeding 100 Sales (Delivery Notes)...")
    for i in range(100):
        try:
            lines = []
            selected_items = random.sample(item_ids, random.randint(1, 4))
            for item_id in selected_items:
                lines.append(DeliveryNoteLine(
                    item_id=item_id,
                    warehouse_id=random.choice(wh_ids),
                    quantity=str(random.randint(1, 5))
                ))
            do_data = DeliveryNoteCreate(
                number=f"DO-{2024}-{i+1:03d}",
                lines=lines,
                customer_account_id=customer_acc_id
            )
            inv_service.create_delivery_note(do_data)
        except: pass

    # 7. Seed 50 Manual Journal Entries (Expenses/Rent/Payroll)
    print("📒 Seeding 50 Manual Journals...")
    for i in range(50):
        try:
            amount = random.randint(100000, 5000000)
            je_data = JournalEntryCreate(
                number=f"MJE-{2024}-{i+1:03d}",
                description=random.choice(["Office Rent", "Staff Salaries", "Utility Bill", "Maintenance"]),
                lines=[
                    JournalLineCreate(account_id=rent_acc_id, debit=str(amount), credit="0.0000", description="Monthly Expense"),
                    JournalLineCreate(account_id=cash_acc_id, debit="0.0000", credit=str(amount), description="Paid via Cash")
                ]
            )
            acc_service.create_journal_entry(je_data)
        except: pass

    print("✨ Massive Seeding Completed Successfully!")

if __name__ == "__main__":
    seed_massive_data()
