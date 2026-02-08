from app.core.firebase import get_db

def seed_iraqi_coa():
    """Seeds the Iraqi Unified Chart of Accounts (Lite) into Firestore."""
    db = get_db()
    
    # Top level groups using string values for Firestore
    coa_data = [
        {"code": "1", "name": "Assets", "type": "ASSET", "is_group": True},
        {"code": "11", "name": "Fixed Assets", "type": "ASSET", "is_group": True, "parent_code": "1"},
        {"code": "12", "name": "Current Assets", "type": "ASSET", "is_group": True, "parent_code": "1"},
        {"code": "121", "name": "Inventory", "type": "ASSET", "is_group": False, "parent_code": "12"},
        {"code": "122", "name": "Accounts Receivable", "type": "ASSET", "is_group": False, "parent_code": "12"},
        {"code": "123", "name": "Cash & Bank", "type": "ASSET", "is_group": False, "parent_code": "12"},
        
        {"code": "2", "name": "Liabilities", "type": "LIABILITY", "is_group": True},
        {"code": "21", "name": "Accounts Payable", "type": "LIABILITY", "is_group": False, "parent_code": "2"},
        
        {"code": "3", "name": "Equity", "type": "EQUITY", "is_group": True},
        {"code": "31", "name": "Capital", "type": "EQUITY", "is_group": False, "parent_code": "3"},
        
        {"code": "4", "name": "Revenue", "type": "REVENUE", "is_group": True},
        {"code": "41", "name": "Sales", "type": "REVENUE", "is_group": False, "parent_code": "4"},
        
        {"code": "5", "name": "Expenses", "type": "EXPENSE", "is_group": True},
        {"code": "51", "name": "Cost of Goods Sold (COGS)", "type": "EXPENSE", "is_group": False, "parent_code": "5"},
        {"code": "52", "name": "Administrative Expenses", "type": "EXPENSE", "is_group": False, "parent_code": "5"},
    ]
    
    created_count = 0
    for item in coa_data:
        # Check if code already exists
        exists = list(db.collection("accounts").where("code", "==", item["code"]).limit(1).stream())
        if exists:
            continue
            
        parent_id = None
        if "parent_code" in item:
            parent_query = list(db.collection("accounts").where("code", "==", item["parent_code"]).limit(1).stream())
            if parent_query:
                parent_id = parent_query[0].id
        
        doc_ref = db.collection("accounts").document()
        doc_ref.set({
            "code": item["code"],
            "name": item["name"],
            "type": item["type"],
            "is_group": item["is_group"],
            "parent_id": parent_id
        })
        created_count += 1
    
    return created_count
