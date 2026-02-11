from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.auth import get_current_user
from app.schemas.erp import (
    ItemCreate, Item, WarehouseCreate, Warehouse, UOMCreate, UOM
)
from datetime import datetime

router = APIRouter()

# ===================== PRODUCTS (ITEMS) =====================
@router.get("/products", response_model=List[Item])
async def list_products(
    page: int = 1,
    limit: int = 10,
    customer_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_db()
    company_id = user.get("company_id")
    
    query = db.collection("items").where("company_id", "==", company_id)
    if customer_id:
        query = query.where("customer_id", "==", customer_id)
    
    # Simple offset-based pagination
    offset = (page - 1) * limit
    docs = query.limit(limit).offset(offset).stream()
    
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/products", response_model=Item)
async def create_product(data: ItemCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    item_data = data.model_dump()
    item_data.update({
        "company_id": company_id,
        "current_qty": "0.0000",
        "total_value": "0.0000",
        "current_wac": "0.0000",
        "created_at": datetime.utcnow()
    })
    doc_ref = db.collection("items").document()
    doc_ref.set(item_data)
    return {"id": doc_ref.id, **item_data}

# ===================== WAREHOUSES =====================
@router.get("/warehouses", response_model=List[Warehouse])
async def list_warehouses(user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    docs = db.collection("warehouses").where("company_id", "==", company_id).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/warehouses", response_model=Warehouse)
async def create_warehouse(data: WarehouseCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    wh_data = data.model_dump()
    wh_data.update({"company_id": company_id})
    doc_ref = db.collection("warehouses").document()
    doc_ref.set(wh_data)
    return {"id": doc_ref.id, **wh_data}

# ===================== UOM (Units of Measure) =====================
@router.get("/uoms", response_model=List[UOM])
async def list_uoms(user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    docs = db.collection("uoms").where("company_id", "==", company_id).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/uoms", response_model=UOM)
async def create_uom(data: UOMCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    uom_data = data.model_dump()
    uom_data.update({"company_id": company_id})
    doc_ref = db.collection("uoms").document()
    doc_ref.set(uom_data)
    return {"id": doc_ref.id, **uom_data}
