from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.core.auth import get_current_user
from app.core.firebase import get_db
from app.services.accounting import AccountingService
from app.schemas.accounting import AccountCreate, JournalEntryCreate
from google.cloud import firestore

router = APIRouter()

# ===================== ACCOUNTS =====================
@router.get("/accounts")
async def get_accounts(
    type: Optional[str] = None, 
    tree: bool = False,
    user: dict = Depends(get_current_user)
):
    """Get accounts with hierarchy and filters."""
    try:
        company_id = user.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Missing company_id")
        
        service = AccountingService()
        if tree:
            return service.get_accounts_tree(company_id)
        
        return service.get_accounts(company_id, type_filter=type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/accounts")
async def create_account(data: AccountCreate, user: dict = Depends(get_current_user)):
    try:
        service = AccountingService()
        account_id = service.create_account(data, user)
        return {"status": "created", "id": account_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===================== JOURNALS =====================
@router.get("/journals")
async def list_journals(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    user: dict = Depends(get_current_user)
):
    try:
        db = get_db()
        company_id = user.get("company_id")
        
        query = db.collection("journal_entries").where("company_id", "==", company_id)
        
        if status:
            query = query.where("status", "==", status)
        if date_from:
            query = query.where("date", ">=", date_from)
        if date_to:
            query = query.where("date", "<=", date_to)
            
        # Order by date desc
        query = query.order_by("date", direction=firestore.Query.DESCENDING)
        
        # Pagination
        docs = query.limit(page_size).offset((page - 1) * page_size).stream()
        
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/journals/{journal_id}")
async def get_journal(journal_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = db.collection("journal_entries").document(journal_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return {"id": doc.id, **doc.to_dict()}
