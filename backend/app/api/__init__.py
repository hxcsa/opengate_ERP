from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.auth import get_current_user
from app.core.audit import get_audit_logger
from app.schemas.erp import (
    AccountCreate, ItemCreate, JournalEntryCreate, 
    GRNCreate, DeliveryNoteCreate
)
from app.services.inventory import InventoryService
from app.services.accounting import AccountingService
from app.services.reporting import ReportingService
from app.services.integration import IntegrationService, ReturnCreate, TransferCreate
from app.services.lifecycle import get_lifecycle_service
from app.services.fiscal import get_fiscal_service
from app.services.users import get_users_service
from app.services.seeding import seed_iraqi_coa
from app.services.currency import get_currency_service
from app.services.sales import get_quotation_service, get_purchase_order_service
from app.services.assets import get_fixed_asset_service


router = APIRouter()

# ===================== SETUP =====================
@router.post("/setup/seed-coa")
async def seed_coa():
    count = seed_iraqi_coa()
    return {"message": f"Iraqi COA seeded successfully. {count} accounts created."}


# ===================== ACCOUNTS =====================
@router.get("/accounts")
async def get_accounts(limit: int = 100, offset: int = 0):
    """Get accounts with pagination for performance."""
    db = get_db()
    # Use limit to prevent fetching entire collection
    docs = db.collection("accounts").order_by("code").limit(limit).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/accounts")
async def create_account(data: AccountCreate):
    db = get_db()
    doc_ref = db.collection("accounts").document()
    doc_ref.set(data.model_dump())
    return {"id": doc_ref.id, **data.model_dump()}

# ===================== ITEMS =====================
@router.get("/inventory/items")
async def get_items(limit: int = 100):
    """Get items with pagination for performance."""
    db = get_db()
    docs = db.collection("items").limit(limit).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/items")
async def create_item(data: ItemCreate):
    db = get_db()
    item_data = data.model_dump()
    item_data.update({"current_qty": "0.0000", "total_value": "0.0000", "current_wac": "0.0000"})
    doc_ref = db.collection("items").document()
    doc_ref.set(item_data)
    return {"id": doc_ref.id, **item_data}

# ===================== WAREHOUSES =====================
@router.get("/warehouses")
async def get_warehouses():
    db = get_db()
    docs = db.collection("warehouses").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/warehouses")
async def create_warehouse(name: str, location: str = ""):
    db = get_db()
    doc_ref = db.collection("warehouses").document()
    doc_ref.set({"name": name, "location": location})
    return {"id": doc_ref.id, "name": name, "location": location}

# ===================== INVENTORY TRANSACTIONS =====================
@router.post("/inventory/grn")
async def create_grn(data: GRNCreate):
    service = InventoryService()
    try:
        je_id = service.create_goods_receipt(data)
        return {"status": "success", "journal_entry_id": je_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/inventory/delivery-note")
async def create_delivery_note(data: DeliveryNoteCreate):
    service = InventoryService()
    try:
        je_id = service.create_delivery_note(data)
        return {"status": "success", "journal_entry_id": je_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/inventory/delivery")
async def create_delivery(data: DeliveryNoteCreate):
    service = InventoryService()
    try:
        je_id = service.create_delivery_note(data)
        return {"status": "success", "journal_entry_id": je_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/inventory/return/sales")
async def create_sales_return(data: ReturnCreate):
    service = IntegrationService()
    je_id = await service.create_sales_return(data)
    return {"message": "Sales Return Processed", "journal_entry_id": je_id}

@router.post("/inventory/return/purchase")
async def create_purchase_return(data: ReturnCreate):
    service = IntegrationService()
    je_id = await service.create_purchase_return(data)
    return {"message": "Purchase Return Processed", "journal_entry_id": je_id}

@router.post("/inventory/transfer")
async def create_transfer(data: TransferCreate):
    service = IntegrationService()
    result = await service.create_stock_transfer(data)
    return result

# ===================== ACCOUNTING =====================
@router.post("/accounting/journal")
async def create_journal(data: JournalEntryCreate):
    service = AccountingService()
    try:
        je_id = service.create_journal_entry(data)
        return {"message": "Journal Entry Posted", "id": je_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")

@router.get("/accounting/journals")
async def get_journals(limit: int = 50):
    """Get recent journals with pagination."""
    db = get_db()
    # Limit and order by date descending for most recent first
    docs = db.collection("journal_entries").order_by("date", direction=firestore.Query.DESCENDING).limit(limit).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

# ===================== REPORTS =====================
@router.get("/reports/trial-balance")
async def get_trial_balance():
    service = ReportingService()
    return await service.get_trial_balance()

@router.get("/reports/inventory-on-hand")
async def get_inventory_on_hand():
    service = ReportingService()
    return await service.get_inventory_on_hand()

@router.get("/reports/inventory-valuation")
async def get_inventory_valuation():
    service = ReportingService()
    return await service.get_inventory_valuation()

@router.get("/reports/general-ledger/{account_id}")
async def get_general_ledger(account_id: str):
    service = ReportingService()
    return await service.get_general_ledger(account_id)

@router.get("/reports/income-statement")
async def get_income_statement():
    service = ReportingService()
    return await service.get_income_statement()

@router.get("/reports/balance-sheet")
async def get_balance_sheet():
    service = ReportingService()
    return await service.get_balance_sheet()

# ===================== ENTERPRISE HARDENING =====================

# --- Audit Trail ---
@router.get("/audit/logs")
async def get_audit_logs(limit: int = 50):
    """Get recent audit log entries (immutable activity feed)."""
    db = get_db()
    docs = db.collection("audit_logs").order_by("timestamp", direction="DESCENDING").limit(limit).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

# --- Document Lifecycle ---
@router.post("/accounting/void/{je_id}")
async def void_journal_entry(je_id: str, reason: str = "Voided by user"):
    """Void a posted journal entry by creating a reversal."""
    try:
        lifecycle = get_lifecycle_service()
        reversal_id = lifecycle.void_journal_entry(je_id, reason)
        return {"status": "voided", "reversal_je_id": reversal_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Fiscal Period Management ---
@router.post("/fiscal/close-period")
async def close_fiscal_period(year: int, month: int):
    """Close a fiscal period (lock transactions for that month)."""
    try:
        fiscal = get_fiscal_service()
        period_id = fiscal.close_period(year, month)
        return {"status": "closed", "period_id": period_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/fiscal/reopen-period")
async def reopen_fiscal_period(year: int, month: int):
    """Reopen a closed fiscal period (admin only)."""
    try:
        fiscal = get_fiscal_service()
        period_id = fiscal.reopen_period(year, month)
        return {"status": "reopened", "period_id": period_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/fiscal/periods")
async def get_fiscal_periods():
    """Get all fiscal periods and their status."""
    db = get_db()
    docs = db.collection("fiscal_periods").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

# --- User & Employee Management ---
@router.get("/users/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user's profile and role."""
    return user

@router.get("/users")
async def list_employees(user: dict = Depends(get_current_user)):
    """List all company employees (Admin only)."""
    service = get_users_service(user)
    return service.list_users()

@router.post("/users")
async def add_employee(
    email: str, 
    password: str, 
    role: str, 
    user: dict = Depends(get_current_user)
):
    """Create a new employee (Admin only)."""
    service = get_users_service(user)
    uid = service.create_employee(email, password, role)
    return {"status": "created", "uid": uid}

@router.put("/users/{user_id}")
async def update_user_role(
    user_id: str,
    role: str,
    user: dict = Depends(get_current_user)
):
    """Update employee role (Admin only)."""
    service = get_users_service(user)
    service.update_user_role(user_id, role)
    return {"status": "updated"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete employee account (Admin only)."""
    service = get_users_service(user)
    service.delete_user(user_id)
    return {"status": "deleted"}

# --- Dashboard & Custom Reports ---
@router.post("/setup/repair-admin")
async def repair_admin(user: dict = Depends(get_current_user)):
    """Promotes the current user to Admin in Firestore."""
    db = get_db()
    uid = user["uid"]
    email = user.get("email")
    
    user_data = {
        "email": email,
        "role": "admin",
        "company_id": "opengate_hq_001",
        "name": email.split("@")[0] if email else "Admin",
        "status": "active",
        "repaired_at": firestore.SERVER_TIMESTAMP
    }
    db.collection("users").document(uid).set(user_data, merge=True)
    return {"status": "success", "message": f"User {email} promoted to admin"}

@router.post("/setup/reseed-all")
async def reseed_all(user: dict = Depends(get_current_user)):
    """Wipes and reseeds with consistent company_id."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
        
    from seed_users import seed_users
    from massive_seed import massive_seed
    
    seed_users() # Refresh roles
    massive_seed() # Regenerate data with company_id
    
    return {"status": "success", "message": "System reseeded with consistent data"}

@router.get("/reports/export/{report_type}")
async def export_report(report_type: str):
    service = ReportingService()
    csv_content = await service.export_to_csv(report_type)
    from fastapi.responses import StreamingResponse
    import io
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
@router.get("/reports/dashboard")
async def get_dashboard_stats():
    service = ReportingService()
    return await service.get_dashboard_stats()

@router.get("/reports/weekly-trend")
async def get_weekly_trend():
    service = ReportingService()
    return await service.get_weekly_revenue()

# --- Inventory Actions ---
@router.post("/inventory/transfer")
async def transfer_stock(from_wh: str, to_wh: str, item_id: str, qty: float):
    service = InventoryService()
    service.create_stock_transfer(from_wh, to_wh, item_id, qty)
    return {"status": "success"}

@router.post("/inventory/adjust")
async def adjust_stock(item_id: str, warehouse_id: str, qty: float, reason: str):
    service = InventoryService()
    service.adjust_stock(item_id, warehouse_id, qty, reason)
    return {"status": "success"}

@router.get("/inventory/history")
async def get_stock_history(item_id: str = None, limit: int = 50):
    db = get_db()
    query = db.collection("stock_ledger").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit)
    if item_id:
        query = query.where("item_id", "==", item_id)
    
    docs = query.stream()
    history = []
    
    # We need to fetch item names effectively. 
    # For speed, we just return IDs and let frontend map them or do a secondary fetch if needed.
    # Or strict join if small. Let's return raw for now.
    for doc in docs:
        d = doc.to_dict()
        history.append({"id": doc.id, **d})
    return history

# ===================== ENTERPRISE FEATURES =====================

# --- Multi-Currency ---

@router.get("/currency/rate")
async def get_exchange_rate():
    """Get current USD/IQD exchange rate."""
    service = get_currency_service()
    rate = service.get_current_rate()
    return {"from": "USD", "to": "IQD", "rate": str(rate)}

@router.post("/currency/rate")
async def set_exchange_rate(rate: float, user: dict = Depends(get_current_user)):
    """Update exchange rate (Admin only)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from decimal import Decimal
    service = get_currency_service()
    return service.set_rate(Decimal(str(rate)))

# --- Quotations & Sales Orders ---

@router.get("/quotations")
async def list_quotations(status: str = None, limit: int = 50):
    """List all quotations."""
    service = get_quotation_service()
    return service.list_quotations(status, limit)

@router.post("/quotations")
async def create_quotation(data: dict):
    """Create a new quotation."""
    service = get_quotation_service()
    quo_id = service.create_quotation(data)
    return {"status": "created", "id": quo_id}

@router.post("/quotations/{quo_id}/convert")
async def convert_quotation_to_order(quo_id: str):
    """Convert quotation to sales order."""
    service = get_quotation_service()
    so_id = service.convert_to_sales_order(quo_id)
    return {"status": "converted", "sales_order_id": so_id}

@router.get("/sales-orders")
async def list_sales_orders(status: str = None, limit: int = 50):
    """List all sales orders."""
    service = get_quotation_service()
    return service.list_sales_orders(status, limit)

# --- Purchase Orders ---
@router.get("/purchase-orders")
async def list_purchase_orders(status: str = None, limit: int = 50):
    """List all purchase orders."""
    service = get_purchase_order_service()
    return service.list_purchase_orders(status, limit)

@router.post("/purchase-orders")
async def create_purchase_order(data: dict):
    """Create a new purchase order."""
    service = get_purchase_order_service()
    po_id = service.create_purchase_order(data)
    return {"status": "created", "id": po_id}

@router.post("/purchase-orders/{po_id}/approve")
async def approve_purchase_order(po_id: str, user: dict = Depends(get_current_user)):
    """Approve a purchase order."""
    if user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager or Admin required")
    service = get_purchase_order_service()
    return service.approve_po(po_id, user.get("uid"))

# --- Fixed Assets ---

@router.get("/assets")
async def list_fixed_assets(status: str = "ACTIVE"):
    """List all fixed assets."""
    service = get_fixed_asset_service()
    return service.list_assets(status)

@router.post("/assets")
async def create_fixed_asset(data: dict):
    """Register a new fixed asset."""
    service = get_fixed_asset_service()
    asset_id = service.create_asset(data)
    return {"status": "created", "id": asset_id}

@router.get("/assets/summary")
async def get_asset_summary():
    """Get depreciation summary for all assets."""
    service = get_fixed_asset_service()
    return service.get_depreciation_summary()

@router.post("/assets/{asset_id}/depreciate")
async def record_depreciation(asset_id: str, period: str):
    """Record monthly depreciation for an asset."""
    service = get_fixed_asset_service()
    amount = service.calculate_monthly_depreciation(asset_id)
    entry_id = service.record_depreciation(asset_id, amount, period)
    return {"status": "recorded", "amount": str(amount), "entry_id": entry_id}
