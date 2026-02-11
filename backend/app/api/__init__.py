from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.auth import get_current_user
from app.core.audit import get_audit_logger
from app.schemas.erp import (
    ItemCreate, GRNCreate, DeliveryNoteCreate, EmployeeCreate,
    WarehouseCreate, UOMCreate
)
from app.schemas.accounting import (
    AccountCreate, JournalEntryCreate, 
    PaymentVoucherCreate, ReceiptVoucherCreate, CreditNoteCreate
)
from app.services.inventory import InventoryService
from app.services.accounting import AccountingService
from app.services.vouchers import get_voucher_service
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

# ===================== DIAGNOSTICS =====================
@router.get("/debug/routes")
async def debug_routes():
    """List all registered routes (no auth required) for debugging."""
    return {
        "status": "ok",
        "message": "Backend is running",
        "registered_sub_routers": [
            "/accounting (GET /accounts, POST /accounts, GET /journals)",
            "/credit-notes (GET /, POST /)",
            "/expenses (GET /, POST /)",
        ]
    }

@router.get("/debug/auth-test")
async def debug_auth_test(request: Request):
    """Test auth header forwarding (no auth required) - shows what headers arrive."""
    auth_header = request.headers.get("Authorization")
    all_headers = dict(request.headers)
    return {
        "auth_header_present": bool(auth_header),
        "auth_header_preview": str(auth_header)[:50] if auth_header else None,
        "all_header_keys": list(all_headers.keys()),
        "host": all_headers.get("host"),
        "origin": all_headers.get("origin"),
    }

# ===================== SETUP =====================
@router.post("/setup/seed-coa")
async def seed_coa():
    count = seed_iraqi_coa()
    return {"message": f"Iraqi COA seeded successfully. {count} accounts created."}

# ===================== USER PROFILE =====================
@router.get("/me")
async def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return {
        "uid": user.get("uid"),
        "email": user.get("email"),
        "role": user.get("role"),
        "company_id": user.get("company_id"),
        "full_name": user.get("full_name"),
        "phone": user.get("phone")
    }

# ===================== ACCOUNTING =====================
from app.api.accounting import router as accounting_router
router.include_router(accounting_router, prefix="/accounting", tags=["Accounting"])
# Backward-compatible: also mount at root so /api/accounts and /api/accounting/accounts both work
router.include_router(accounting_router, tags=["Accounting (Legacy)"])

# ===================== CREDIT NOTES =====================
from app.api.credit_notes import router as credit_notes_router
router.include_router(credit_notes_router, prefix="/credit-notes", tags=["Credit Notes"])

# ===================== EXPENSES =====================
from app.api.expenses import router as expenses_router
router.include_router(expenses_router, prefix="/expenses", tags=["Expenses"])

# ===================== WAREHOUSE MODULE =====================
from app.api.warehouse import router as warehouse_router
router.include_router(warehouse_router, prefix="/warehouse", tags=["Warehouse"])

# ===================== INTENTS =====================
from app.api.intents import router as intents_router
router.include_router(intents_router, prefix="/warehouse/intents", tags=["Intents"])

# ===================== WAREHOUSE OPERATIONS =====================
from app.api.operations import router as ops_router
router.include_router(ops_router, prefix="/warehouse/ops", tags=["Warehouse Operations"])

# ===================== ITEMS =====================
@router.get("/inventory/items")
@router.get("/items")
async def get_items(limit: int = 200):
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
async def get_warehouses(user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    docs = db.collection("warehouses").where("company_id", "==", company_id).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/warehouses")
async def create_warehouse(name: str, location: str = "", user: dict = Depends(get_current_user)):
    if user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    doc_ref = db.collection("warehouses").document()
    doc_ref.set({"name": name, "location": location, "company_id": user.get("company_id")})
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
async def create_journal(data: JournalEntryCreate, user: dict = Depends(get_current_user)):
    service = AccountingService()
    try:
        # Ensure company_id is set from user token
        data.company_id = user.get("company_id")
        je_id = service.create_journal_entry(data)
        return {"message": "Journal Entry Posted", "id": je_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")

# Journals handled in accounting.py

# ===================== VOUCHERS =====================
from app.api.vouchers import router as vouchers_router
router.include_router(vouchers_router, prefix="/accounting/vouchers", tags=["Vouchers"])

# ===================== CATEGORIES =====================

@router.get("/accounting/categories")
async def list_categories(
    search: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """List accounting categories."""
    db = get_db()
    company_id = user.get("company_id")
    docs = db.collection("categories").where("company_id", "==", company_id).stream()
    
    results = []
    for doc in docs:
        item = {"id": doc.id, **doc.to_dict()}
        if status == "active" and not item.get("active", True):
            continue
        if status == "inactive" and item.get("active", True):
            continue
        if search:
            s = search.lower()
            searchable = f"{item.get('name_en','')} {item.get('name_ar','')} {item.get('description','')}".lower()
            if s not in searchable:
                continue
        results.append(item)
    
    return {"categories": results, "total_count": len(results)}

@router.post("/accounting/categories")
async def create_category(data: dict, user: dict = Depends(get_current_user)):
    """Create a new accounting category."""
    db = get_db()
    company_id = user.get("company_id")
    
    category_data = {
        "name_en": data.get("name_en", ""),
        "name_ar": data.get("name_ar", ""),
        "description": data.get("description", ""),
        "active": data.get("active", True),
        "company_id": company_id,
        "created_at": firestore.SERVER_TIMESTAMP
    }
    
    doc_ref = db.collection("categories").document()
    doc_ref.set(category_data)
    
    return {"status": "created", "id": doc_ref.id}

@router.put("/accounting/categories/{category_id}")
async def update_category(category_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update an accounting category."""
    db = get_db()
    doc_ref = db.collection("categories").document(category_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_fields = {k: v for k, v in data.items() if k in ["name_en", "name_ar", "description", "active"]}
    if update_fields:
        doc_ref.update(update_fields)
    
    return {"status": "updated", "id": category_id}

@router.delete("/accounting/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(get_current_user)):
    """Delete an accounting category."""
    db = get_db()
    doc_ref = db.collection("categories").document(category_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Category not found")
    
    doc_ref.delete()
    return {"status": "deleted", "id": category_id}


# ===================== REPORTS =====================
@router.get("/reports/trial-balance")
async def get_trial_balance(user: dict = Depends(get_current_user)):
    service = ReportingService()
    return await service.get_trial_balance(user.get("company_id"))

@router.get("/reports/income-statement")
async def get_income_statement(user: dict = Depends(get_current_user)):
    service = ReportingService()
    return await service.get_income_statement(user.get("company_id"))

@router.get("/reports/balance-sheet")
async def get_balance_sheet(user: dict = Depends(get_current_user)):
    service = ReportingService()
    return await service.get_balance_sheet(user.get("company_id"))

@router.get("/reports/general-ledger")
async def get_general_ledger(
    account_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    service = ReportingService()
    
    # Parse dates if provided
    start = datetime.fromisoformat(from_date) if from_date else None
    end = datetime.fromisoformat(to_date) if to_date else None
    
    return await service.get_general_ledger(
        user.get("company_id"),
        account_id,
        from_date=start,
        to_date=end
    )

@router.get("/reports/aging/{report_type}")
async def get_aging_report(report_type: str, user: dict = Depends(get_current_user)):
    service = ReportingService()
    return await service.get_aging_report(user.get("company_id"), report_type)

@router.get("/reports/reconcile/ar")
async def get_ar_reconciliation(user: dict = Depends(get_current_user)):
    service = ReportingService()
    return await service.get_ar_reconciliation(user.get("company_id"))

@router.get("/reports/reconcile/ap")
async def get_ap_reconciliation(user: dict = Depends(get_current_user)):
    service = ReportingService()
    return await service.get_ap_reconciliation(user.get("company_id"))

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
    """Get current user's profile and role from Firestore."""
    db = get_db()
    uid = user["uid"]
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        profile = doc.to_dict()
        profile["uid"] = uid # Ensure UID is present
        return profile
    return user # Fallback to token claims

@router.get("/users")
async def list_employees(user: dict = Depends(get_current_user)):
    """List all company employees (Admin only)."""
    service = get_users_service(user)
    return service.list_users()

@router.post("/users")
async def add_employee(
    data: EmployeeCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new employee (Admin only)."""
    service = get_users_service(user)
    uid = service.create_employee(data.email, data.password, data.role, data.allowed_tabs)
    return {"status": "created", "uid": uid}

@router.put("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: str,
    allowed_tabs: List[str],
    user: dict = Depends(get_current_user)
):
    """Update granular tab permissions (Admin only)."""
    service = get_users_service(user)
    service.update_permissions(user_id, allowed_tabs)
    return {"status": "updated"}

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
async def export_report(report_type: str, user: dict = Depends(get_current_user)):
    service = ReportingService()
    csv_content = await service.export_to_csv(report_type, user.get("company_id"))
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

@router.get("/sales/invoice/{so_id}")
async def download_sales_invoice(so_id: str):
    """Generate and download sales invoice PDF."""
    from app.services.pdf import PDFService
    service = get_quotation_service()
    
    # Get Sales Order Data
    try:
        db = get_db()
        d = db.collection("sales_orders").document(so_id).get()
        if not d.exists:
            raise HTTPException(status_code=404, detail="Order not found")
        data = d.to_dict()
        data['id'] = so_id
        
        pdf_service = PDFService()
        pdf_bytes = pdf_service.generate_invoice(data, type="SALES INVOICE")
        
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invoice_{so_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/purchasing/invoice/{po_id}")
async def download_purchase_invoice(po_id: str):
    """Generate and download purchase order PDF."""
    from app.services.pdf import PDFService
    
    try:
        db = get_db()
        d = db.collection("purchase_orders").document(po_id).get()
        if not d.exists:
            raise HTTPException(status_code=404, detail="Order not found")
        data = d.to_dict()
        data['id'] = po_id
        
        pdf_service = PDFService()
        pdf_bytes = pdf_service.generate_invoice(data, type="PURCHASE ORDER")
        
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=po_{po_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Invoices (Sales) ---
from app.services.invoices import get_invoice_service
from app.schemas.invoices import InvoiceCreate

@router.get("/sales/invoices")
async def list_invoices(
    status: Optional[str] = None, 
    customer_id: Optional[str] = None,
    search: Optional[str] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    user: dict = Depends(get_current_user)
):
    """List invoices with filters."""
    service = get_invoice_service()
    
    # Parse dates if provided
    date_from = None
    date_to = None
    if dateFrom:
        try:
            date_from = datetime.fromisoformat(dateFrom)
        except ValueError:
            pass
    if dateTo:
        try:
            date_to = datetime.fromisoformat(dateTo)
        except ValueError:
            pass
    
    return service.list_invoices(
        company_id=user.get("company_id"),
        status=status,
        customer_id=customer_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size
    )

@router.post("/sales/invoices")
async def create_invoice(data: InvoiceCreate, user: dict = Depends(get_current_user)):
    """Create a new invoice."""
    service = get_invoice_service()
    invoice_id = service.create_invoice(data, user)
    
    # Audit log
    audit = get_audit_logger(user.get("uid"), user.get("company_id"))
    audit.log_create("invoices", invoice_id, data.model_dump(), f"Created invoice {data.invoice_number}")
    
    return {"status": "created", "id": invoice_id}

@router.get("/sales/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Get invoice details."""
    service = get_invoice_service()
    invoice = service.get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.post("/sales/invoices/{invoice_id}/void")
async def void_invoice(invoice_id: str, reason: str = "Voided by user", user: dict = Depends(get_current_user)):
    """Void an invoice (Admin/Accountant only)."""
    # Role check
    if user.get("role") not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    service = get_invoice_service()
    inv_before = service.get_invoice(invoice_id)
    result = service.void_invoice(invoice_id, reason, user)
    
    # Audit log
    audit = get_audit_logger(user.get("uid"), user.get("company_id"))
    audit.log_void("invoices", invoice_id, inv_before, f"Voided invoice: {reason}")
    
    return result

@router.post("/sales/invoices/{invoice_id}/pay")
async def mark_invoice_paid(
    invoice_id: str, 
    amount: float, 
    payment_method: str = "CASH", 
    user: dict = Depends(get_current_user)
):
    """Mark invoice as paid."""
    if user.get("role") not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
        
    service = get_invoice_service()
    inv_before = service.get_invoice(invoice_id)
    result = service.mark_paid(invoice_id, amount, payment_method, user)
    
    # Audit log
    audit = get_audit_logger(user.get("uid"), user.get("company_id"))
    audit.log_update("invoices", invoice_id, inv_before, result, f"Paid {amount} via {payment_method}")
    
    return result

@router.put("/sales/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update a DRAFT invoice."""
    from app.schemas.invoices import InvoiceUpdate
    service = get_invoice_service()
    
    update_data = InvoiceUpdate(**data)
    result = service.update_invoice(invoice_id, update_data, user)
    
    audit = get_audit_logger(user.get("uid"), user.get("company_id"))
    audit.log_update("invoices", invoice_id, {}, result, f"Updated invoice {invoice_id}")
    
    return result

@router.post("/sales/invoices/{invoice_id}/issue")
async def issue_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Issue a DRAFT invoice (DRAFT -> ISSUED)."""
    if user.get("role") not in ["admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Only admin/accountant can issue invoices")
    
    service = get_invoice_service()
    result = service.mark_issued(invoice_id, user)
    
    audit = get_audit_logger(user.get("uid"), user.get("company_id"))
    audit.log_update("invoices", invoice_id, {}, result, f"Issued invoice {invoice_id}")
    
    return result

# ===================== CUSTOMERS =====================
from app.services.customers import get_customers_service
from app.schemas.customers import CustomerCreate

@router.get("/customers")
async def list_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    user: dict = Depends(get_current_user)
):
    """List customers with search and filters."""
    service = get_customers_service(user)
    return service.list_customers(search=search, status=status, page=page, page_size=page_size)

@router.post("/customers")
async def create_customer(data: CustomerCreate, user: dict = Depends(get_current_user)):
    """Create a new customer."""
    service = get_customers_service(user)
    customer_id = service.create_customer(data.model_dump())
    
    audit = get_audit_logger(user.get("uid"), user.get("company_id"))
    audit.log_create("customers", customer_id, data.model_dump(), f"Created customer {data.first_name} {data.last_name}")
    
    return {"status": "created", "id": customer_id}

@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    """Get customer details."""
    service = get_customers_service(user)
    customer = service.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update customer details."""
    service = get_customers_service(user)
    result = service.update_customer(customer_id, data)
    
    audit = get_audit_logger(user.get("uid"), user.get("company_id"))
    audit.log_update("customers", customer_id, {}, result, f"Updated customer {customer_id}")
    
    return result

# ===================== EMPLOYEES (Enhanced) =====================
@router.get("/employees")
async def list_employees(
    search: Optional[str] = None,
    role_filter: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """List all employees with optional search and role filter."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    db = get_db()
    company_id = user.get("company_id")
    docs = db.collection("users").where("company_id", "==", company_id).stream()
    
    results = []
    for d in docs:
        item = {"id": d.id, **d.to_dict()}
        # Apply search filter
        if search:
            search_lower = search.lower()
            name = (item.get("full_name") or item.get("email", "")).lower()
            email = (item.get("email") or "").lower()
            phone = (item.get("phone") or "").lower()
            if not any(search_lower in f for f in [name, email, phone]):
                continue
        # Apply role filter
        if role_filter and item.get("role") != role_filter:
            continue
        results.append(item)
    
    return {"employees": results, "total_count": len(results)}

@router.post("/employees")
async def create_employee(data: dict, user: dict = Depends(get_current_user)):
    """Create a new employee with Firebase Auth + Firestore profile."""
    service = get_users_service(user)
    uid = service.create_employee(
        email=data.get("email"),
        password=data.get("password"),
        role=data.get("role", "viewer"),
        allowed_tabs=data.get("allowed_tabs")
    )
    
    # Update with additional fields (full_name, phone)
    db = get_db()
    extra = {}
    if data.get("full_name"):
        extra["full_name"] = data["full_name"]
    if data.get("phone"):
        extra["phone"] = data["phone"]
    if extra:
        db.collection("users").document(uid).update(extra)
    
    audit = get_audit_logger(user.get("uid"), user.get("company_id"))
    audit.log_create("employees", uid, {"email": data.get("email"), "role": data.get("role")}, f"Created employee {data.get('email')}")
    
    return {"status": "created", "id": uid}

@router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update employee details (Admin only)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    db = get_db()
    doc_ref = db.collection("users").document(employee_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_fields = {k: v for k, v in data.items() if v is not None and k not in ["password", "id"]}
    if update_fields:
        doc_ref.update(update_fields)
    
    return {"status": "updated", "id": employee_id}

# --- AP/Purchasing ---
@router.get("/purchasing/bills")
async def list_bills(
    supplier_id: Optional[str] = None, 
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_db()
    query = db.collection("bills").where("company_id", "==", user.get("company_id"))
    if supplier_id:
        query = query.where("supplier_id", "==", supplier_id)
    if status:
        query = query.where("status", "==", status)
    
    docs = query.stream()
    return {"bills": [{"id": d.id, **d.to_dict()} for d in docs]}

@router.get("/suppliers")
async def list_suppliers(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("suppliers").where("company_id", "==", user.get("company_id")).stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]
@router.get("/purchase-orders")
async def list_purchase_orders(status: Optional[str] = None, limit: int = 50):
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
async def list_fixed_assets(status: Optional[str] = "ACTIVE"):
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
async def record_depreciation(asset_id: str, period: str = None):
    """Record monthly depreciation for an asset."""
    service = get_fixed_asset_service()
    amount = service.calculate_monthly_depreciation(asset_id)
    entry_id = service.record_depreciation(asset_id, amount, period)
    return {"status": "recorded", "amount": str(amount), "entry_id": entry_id}
# --- Scheduling & Ecosystem ---

@router.get("/scheduling/shifts")
async def list_shifts(user: dict = Depends(get_current_user)):
    """List all shifts for the company."""
    db = get_db()
    company_id = user.get("company_id")
    
    query = db.collection("shifts").where("company_id", "==", company_id)
    
    # Privacy: Non-admins only see their own shifts
    if user.get("role") != "admin":
        query = query.where("employee", "==", user.get("email"))
        
    docs = query.stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/scheduling/shifts")
async def create_shift(data: dict, user: dict = Depends(get_current_user)):
    """Assign a shift (Admin only)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    db = get_db()
    data["company_id"] = user.get("company_id")
    data["created_at"] = firestore.SERVER_TIMESTAMP
    doc_ref = db.collection("shifts").document()
    doc_ref.set(data)
    
    # Return serializable data
    response_data = {**data, "id": doc_ref.id}
    if "created_at" in response_data:
        del response_data["created_at"] # Avoid serialization error
    return response_data

@router.get("/scheduling/announcements")
async def list_announcements(user: dict = Depends(get_current_user)):
    """List all store announcements."""
    db = get_db()
    company_id = user.get("company_id")
    # Note: Removed order_by to avoid requiring composite index
    docs = db.collection("announcements").where("company_id", "==", company_id).limit(20).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/scheduling/announcements")
async def create_announcement(data: dict, user: dict = Depends(get_current_user)):
    """Post an announcement (Admin only)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    db = get_db()
    data["company_id"] = user.get("company_id")
    data["created_at"] = firestore.SERVER_TIMESTAMP
    doc_ref = db.collection("announcements").document()
    doc_ref.set(data)
    
    response_data = {**data, "id": doc_ref.id}
    if "created_at" in response_data:
        del response_data["created_at"]
    return response_data

    return response_data

@router.get("/debug/list-rv-no-auth")
async def debug_list_rv():
    """Debug endpoint without auth to test RV listing logic."""
    db = get_db()
    company_id = "opengate_hq_001"
    docs = db.collection("receipt_vouchers").where("company_id", "==", company_id).stream()
    results = []
    for doc in docs:
        results.append({"id": doc.id, **doc.to_dict()})
    return results

from app.api.reports import router as reports_router
router.include_router(reports_router, prefix="/reports", tags=["Reports"])

from app.api.credit_notes import router as cn_router
router.include_router(cn_router, prefix="/credit-notes", tags=["Credit Notes"])

from app.api.expenses import router as exp_router
router.include_router(exp_router, prefix="/expenses", tags=["Expenses"])
