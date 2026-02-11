import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
import random
from app.core.firebase import get_db
from app.services.accounting import AccountingService
from app.schemas.accounting import JournalEntryCreate, JournalLineBase

async def seed_more_data():
    db = get_db()
    service = AccountingService()
    
    # Get standard IDs for OPENGATE_CORP
    company_id = "OPENGATE_CORP"
    
    # Fetch some accounts
    accs = list(db.collection("accounts").where("company_id", "==", company_id).stream())
    acc_map = {a.to_dict().get("code"): a.id for a in accs}
    
    print(f"Found {len(accs)} accounts for {company_id}")
    
    # Required accounts
    cash_id = acc_map.get("1100") # Cash
    bank_id = acc_map.get("123")  # Cash & Bank
    sales_id = acc_map.get("41")  # Sales
    purch_id = acc_map.get("51")  # Cost of Goods Sold (COGS) / Purchases
    exp_id = acc_map.get("52")    # Administrative Expenses
    
    # If 3 is a group, find a child
    if not exp_id:
        exp_id = next((a.id for a in accs if a.to_dict().get("code").startswith("3")), None)
        
    if not all([cash_id, sales_id]):
        print("Missing critical accounts (Cash or Sales). Cannot seed.")
        return

    print("🚀 Seeding 10 diverse journal entries...")
    
    for i in range(10):
        date = datetime.now() - timedelta(days=random.randint(0, 30))
        amount = Decimal(random.randint(500, 5000)) * 1000 # IQD scale
        
        # Randomly choose between Sales, Purchase, or Expense
        type_choice = random.choice(["SALES", "PURCHASE", "EXPENSE"])
        
        lines = []
        if type_choice == "SALES":
            # Dr Cash (111), Cr Sales (41)
            lines = [
                JournalLineBase(account_id=cash_id, debit=str(amount), credit="0", memo="Cash Sale"),
                JournalLineBase(account_id=sales_id, debit="0", credit=str(amount), memo="Daily Revenue")
            ]
            desc = f"Daily Sales Entry #{i+1}"
        elif type_choice == "PURCHASE" and purch_id:
            # Dr Purchase (511), Cr Cash (111)
            lines = [
                JournalLineBase(account_id=purch_id, debit=str(amount), credit="0", memo="Inventory Restock"),
                JournalLineBase(account_id=cash_id, debit="0", credit=str(amount), memo="Payment for Goods")
            ]
            desc = f"Inventory Purchase #{i+1}"
        else:
            # General Expense
            target_account = exp_id if exp_id else cash_id # fallback
            lines = [
                JournalLineBase(account_id=target_account, debit=str(amount), credit="0", memo="Misc Expense"),
                JournalLineBase(account_id=cash_id, debit="0", credit=str(amount), memo="Cash Payment")
            ]
            desc = f"Office Expense #{i+1}"

        try:
            je_data = JournalEntryCreate(
                number=f"SEED-{date.strftime('%Y%m%d')}-{i}",
                date=date,
                description=desc,
                lines=lines,
                company_id=company_id
            )
            service.create_journal_entry(je_data)
            print(f"✅ Added {type_choice} entry for {amount:,.0f} IQD")
        except Exception as e:
            print(f"❌ Failed to add entry {i}: {e}")

    print("✨ Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_more_data())
