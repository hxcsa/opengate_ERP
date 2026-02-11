from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.auth import get_current_user
from app.schemas.accounting import PaymentVoucherCreate, ReceiptVoucherCreate
from app.services.vouchers import get_voucher_service

router = APIRouter()

@router.post("/payment")
async def create_payment_voucher(data: PaymentVoucherCreate, user: dict = Depends(get_current_user)):
    """Create a payment voucher (+ Journal Entry)."""
    service = get_voucher_service()
    data.company_id = user.get("company_id")
    try:
        voucher_id = service.create_payment_voucher(data)
        return {"status": "success", "id": voucher_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/payment")
async def list_payment_vouchers(
    limit: int = Query(50),
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    print(f"📡 [API] list_payment_vouchers | user: {user.get('email')}, company: {user.get('company_id')}")
    db = get_db()
    company_id = user.get("company_id")
    try:
        docs = db.collection("payment_vouchers")\
            .where("company_id", "==", company_id)\
            .stream()
        
        results = []
        for doc in docs:
            item = {"id": doc.id, **doc.to_dict()}
            item_date = item.get("date")
            item_date_str = ""
            if item_date:
                if hasattr(item_date, "isoformat"):
                    item_date_str = item_date.isoformat()[:10]
                elif isinstance(item_date, str):
                    item_date_str = item_date[:10]
            
            if date_from and item_date_str < date_from:
                continue
            if date_to and item_date_str > date_to:
                continue
            if payment_method and item.get("payment_method") != payment_method:
                continue
            if search:
                s = search.lower()
                text = f"{item.get('voucher_number','')} {item.get('payee','')} {item.get('description','')}".lower()
                if s not in text:
                    continue
            results.append(item)
        
        results.sort(key=lambda x: str(x.get("date", "")), reverse=True)
        return results[:limit]
    except Exception as e:
        print(f"❌ [API] Error in list_payment_vouchers: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/receipt")
async def create_receipt_voucher(data: ReceiptVoucherCreate, user: dict = Depends(get_current_user)):
    """Create a receipt voucher (+ Journal Entry)."""
    service = get_voucher_service()
    data.company_id = user.get("company_id")
    try:
        voucher_id = service.create_receipt_voucher(data)
        return {"status": "success", "id": voucher_id}
    except Exception as e:
        print(f"❌ [API] Error in create_receipt_voucher: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/receipt")
async def list_receipt_vouchers(
    limit: int = Query(50),
    search: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    print(f"📡 [API] list_receipt_vouchers | user: {user.get('email')}, company: {user.get('company_id')}")
    db = get_db()
    company_id = user.get("company_id")
    try:
        docs = db.collection("receipt_vouchers")\
            .where("company_id", "==", company_id)\
            .stream()
        
        results = []
        for doc in docs:
            item = {"id": doc.id, **doc.to_dict()}
            item_date = item.get("date")
            item_date_str = ""
            if item_date:
                if hasattr(item_date, "isoformat"):
                    item_date_str = item_date.isoformat()[:10]
                elif isinstance(item_date, str):
                    item_date_str = item_date[:10]
            
            if date_from and item_date_str < date_from:
                continue
            if date_to and item_date_str > date_to:
                continue
            if payment_method and item.get("payment_method") != payment_method:
                continue
            if customer_id and item.get("customer_id") != customer_id:
                continue
            if search:
                s = search.lower()
                text = f"{item.get('receipt_number','')} {item.get('customer_id','')}".lower()
                if s not in text:
                    continue
            results.append(item)
        
        results.sort(key=lambda x: str(x.get("date", "")), reverse=True)
        return results[:limit]
    except Exception as e:
        import traceback
        error_msg = f"❌ [API] Error in list_receipt_vouchers: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        with open("error.log", "a") as f:
            f.write(error_msg + "\n" + "="*50 + "\n")
        raise HTTPException(status_code=400, detail=str(e))
