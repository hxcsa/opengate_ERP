from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.auth import get_current_user
from app.schemas.erp import (
    TransferCreate, AdjustmentCreate, AdjustmentStatus,
    GRNCreate, DeliveryNoteCreate
)
from datetime import datetime

router = APIRouter()

@router.post("/inbound")
async def create_inbound(data: GRNCreate, user: dict = Depends(get_current_user)):
    """Create a Goods Receipt Note (GRN) for Inbound Stock."""
    db = get_db()
    company_id = user.get("company_id")
    from app.services.inventory import InventoryService
    inventory_service = InventoryService()
    
    # We don't save the GRN document itself in this simple endpoint wrapper
    # InventoryService.create_goods_receipt handles the logic and checking. 
    # However, create_goods_receipt expects data to be GRNCreate.
    # It creates a Journal Entry and potentially a Bill.
    
    # We might want to save the GRN record itself too? 
    # InventoryService.create_goods_receipt DOES NOT save a "grn" document, it saves ledger/journal.
    # But it creates a Bill. 
    # Let's see if we should save a GRN document.
    # The current `create_goods_receipt` logic:
    # 1. READS items
    # 2. CALCULATES updates
    # 3. WRITES items, stock_ledger, journal_entry, bill.
    # It does NOT write to a "grns" collection. 
    # For now, let's keep it consistent with the service. 
    # But we might want to store the "Inbound" record if we want to list it separately from ledger?
    # The "Inbound" view currently lists stock_ledger entries. 
    # So if we create a stock ledger entry, it will show up.
    
    # We need to ensure data has company_id if needed, but schema GRNCreate doesn't have it.
    # The service gets company_id from items.
    
    result_id = inventory_service.create_goods_receipt(data)
    return {"status": "success", "id": result_id}

@router.post("/outbound")
async def create_outbound(data: DeliveryNoteCreate, user: dict = Depends(get_current_user)):
    """Create a Delivery Note for Outbound Stock."""
    db = get_db()
    company_id = user.get("company_id")
    from app.services.inventory import InventoryService
    inventory_service = InventoryService()
    
    result_id = inventory_service.create_delivery_note(data)
    return {"status": "success", "id": result_id}

@router.get("/inbound")
async def get_inbound(
    warehouse_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_db()
    company_id = user.get("company_id")
    
    # Fetch all stock ledger entries for the company
    docs = db.collection("stock_ledger").where("company_id", "==", company_id).stream()
    
    results = []
    for doc in docs:
        data = doc.to_dict()
        # Filter INBOUND: quantity > 0
        try:
             if float(data.get("quantity", 0)) <= 0: continue
        except: continue
        
        if warehouse_id and data.get("warehouse_id") != warehouse_id:
            continue
            
        if customer_id and data.get("customer_id") != customer_id:
            continue

        results.append({"id": doc.id, **data})

    # Sort in memory reliably
    results.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
    return results

@router.get("/outbound")
async def get_outbound(
    warehouse_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_db()
    company_id = user.get("company_id")
    
    docs = db.collection("stock_ledger").where("company_id", "==", company_id).stream()
    
    results = []
    for doc in docs:
        data = doc.to_dict()
        # Filter OUTBOUND: quantity < 0
        try:
             if float(data.get("quantity", 0)) >= 0: continue
        except: continue
        
        if warehouse_id and data.get("warehouse_id") != warehouse_id:
            continue
            
        if customer_id and data.get("customer_id") != customer_id:
            continue

        results.append({"id": doc.id, **data})
        
    results.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
    return results

@router.get("/transfers")
async def list_transfers(user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    # Simple query
    docs = db.collection("transfers").where("company_id", "==", company_id).stream()
    
    results = [{"id": doc.id, **doc.to_dict()} for doc in docs]
    # Sort in memory
    results.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return results

@router.post("/transfers")
async def create_transfer(data: TransferCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    from app.services.inventory import InventoryService
    inventory_service = InventoryService()
    
    doc_ref = db.collection("transfers").document()
    transfer_data = data.model_dump()
    transfer_data.update({
        "company_id": company_id,
        "created_at": datetime.utcnow(),
        "status": "COMPLETED"
    })
    
    # Process stock movements
    # Schema uses 'items', verify TransferCreate above
    # The TransferCreate schema in erp.py uses 'items'
    inventory_service.create_stock_transfer_v2(data, doc_ref.id)
    
    doc_ref.set(transfer_data)
    return {"id": doc_ref.id, **transfer_data}

@router.get("/adjustments")
async def list_adjustments(user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    docs = db.collection("adjustments").where("company_id", "==", company_id).stream()
    
    results = [{"id": doc.id, **doc.to_dict()} for doc in docs]
    results.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return results

@router.post("/adjustments")
async def create_adjustment(data: AdjustmentCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    from app.services.inventory import InventoryService
    inventory_service = InventoryService()
    
    doc_ref = db.collection("adjustments").document()
    adj_data = data.model_dump()
    adj_data.update({
        "company_id": company_id,
        "created_at": datetime.utcnow()
    })
    
    # Process stock movements
    inventory_service.adjust_stock_v2(data, doc_ref.id)
    
    doc_ref.set(adj_data)
    return {"id": doc_ref.id, **adj_data}

@router.get("/stock")
async def get_item_stock(
    item_id: str,
    warehouse_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Calculate current stock balance for an item."""
    db = get_db()
    company_id = user.get("company_id")
    
    query = db.collection("stock_ledger")\
        .where("company_id", "==", company_id)\
        .where("item_id", "==", item_id)
    
    if warehouse_id:
        query = query.where("warehouse_id", "==", warehouse_id)
        
    docs = query.stream()
    total_qty = 0.0
    for doc in docs:
        try:
            total_qty += float(doc.to_dict().get("quantity", 0))
        except:
            continue
            
    return {"item_id": item_id, "warehouse_id": warehouse_id, "balance": total_qty}
