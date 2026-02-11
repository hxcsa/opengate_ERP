from app.core.firebase import get_db

def seed_iraqi_coa():
    """Seeds the Iraqi Unified Chart of Accounts (Standard) into Firestore."""
    db = get_db()
    
    # Standard Iraqi Unified Accounting System (Lite)
    coa_data = [
        {"code": "1", "name_en": "Assets", "name_ar": "الموجودات", "type": "ASSET", "is_group": True},
        {"code": "11", "name_en": "Fixed Assets", "name_ar": "الموجودات الثابتة", "type": "ASSET", "is_group": True, "parent_code": "1"},
        {"code": "12", "name_en": "Current Assets", "name_ar": "الموجودات المتداولة", "type": "ASSET", "is_group": True, "parent_code": "1"},
        {"code": "121", "name_en": "Inventory", "name_ar": "المخزون", "type": "ASSET", "is_group": False, "parent_code": "12"},
        {"code": "122", "name_en": "Accounts Receivable", "name_ar": "المدينون", "type": "ASSET", "is_group": False, "parent_code": "12"},
        {"code": "123", "name_en": "Cash & Bank", "name_ar": "النقد في الصندوق والحسابات لدى المصارف", "type": "ASSET", "is_group": False, "parent_code": "12"},
        
        {"code": "2", "name_en": "Liabilities", "name_ar": "المطلوبات", "type": "LIABILITY", "is_group": True},
        {"code": "21", "name_en": "Accounts Payable", "name_ar": "الدائنون", "type": "LIABILITY", "is_group": False, "parent_code": "2"},
        {"code": "22", "name_en": "Current Liabilities", "name_ar": "المطلوبات المتداولة", "type": "LIABILITY", "is_group": True, "parent_code": "2"},
        
        {"code": "3", "name_en": "Equity", "name_ar": "حقوق الملكية", "type": "EQUITY", "is_group": True},
        {"code": "31", "name_en": "Capital", "name_ar": "رأس المال", "type": "EQUITY", "is_group": False, "parent_code": "3"},
        
        {"code": "4", "name_en": "Revenue", "name_ar": "الإيرادات", "type": "REVENUE", "is_group": True},
        {"code": "41", "name_en": "Sales", "name_ar": "المبيعات", "type": "REVENUE", "is_group": False, "parent_code": "4"},
        
        {"code": "5", "name_en": "Expenses", "name_ar": "المصروفات", "type": "EXPENSE", "is_group": True},
        {"code": "51", "name_en": "Cost of Goods Sold (COGS)", "name_ar": "كلفة البضاعة المباعة", "type": "EXPENSE", "is_group": False, "parent_code": "5"},
        {"code": "52", "name_en": "Administrative Expenses", "name_ar": "المصروفات الإدارية", "type": "EXPENSE", "is_group": False, "parent_code": "5"},
    ]
    
    created_count = 0
    # First Pass: Create all entries to ensure parent_id can be mapped
    # Note: For simplicity in seeding, we rely on the order of coa_data (parents first)
    
    batch = db.batch()
    
    for item in coa_data:
        # Check if code already exists
        exists = list(db.collection("accounts").where("code", "==", item["code"]).limit(1).stream())
        if exists:
            # Update existing to add bilingual names if missing
            doc_ref = exists[0].reference
            update_data = {
                "name_ar": item["name_ar"],
                "name_en": item["name_en"],
            }
            batch.update(doc_ref, update_data)
            continue
            
        parent_id = None
        if "parent_code" in item:
            parent_query = list(db.collection("accounts").where("code", "==", item["parent_code"]).limit(1).stream())
            if parent_query:
                parent_id = parent_query[0].id
        
        doc_ref = db.collection("accounts").document()
        account_data = {
            "code": item["code"],
            "name_ar": item["name_ar"],
            "name_en": item["name_en"],
            "type": item["type"],
            "is_group": item["is_group"],
            "parent_id": parent_id,
            "currency": "IQD",
            "total_debit": "0.0000",
            "total_credit": "0.0000",
            "balance": "0.0000",
            "company_id": "opengate_hq_001", # Default company for seed
            "status": "ACTIVE"
        }
        batch.set(doc_ref, account_data)
        created_count += 1
    
    batch.commit()
    return created_count
