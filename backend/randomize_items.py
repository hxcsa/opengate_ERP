import random
from app.core.firebase import get_db

def randomize_items():
    db = get_db()
    
    # 1. Get all customers
    customers = list(db.collection("customers").where("company_id", "==", "OPENGATE_CORP").stream())
    if not customers:
        print("No customers found for OPENGATE_CORP. Skipping randomization.")
        return
    
    customer_ids = [doc.id for doc in customers]
    print(f"Found {len(customer_ids)} customers: {customer_ids}")
    
    # 2. Get all items
    items = list(db.collection("items").where("company_id", "==", "OPENGATE_CORP").stream())
    print(f"Found {len(items)} items to randomize.")
    
    # 3. Randomly assign customer_id
    count = 0
    for item in items:
        cid = random.choice(customer_ids)
        item.reference.update({"customer_id": cid})
        count += 1
        
    print(f"Successfully randomized {count} items.")

if __name__ == "__main__":
    randomize_items()
