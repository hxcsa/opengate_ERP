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
        
        # NOTE: We fetch and sort in memory to avoid Firestore index requirements for now
        docs = query.stream()
        results = []
        for doc in docs:
            data = doc.to_dict()
            results.append({"id": doc.id, **data})
            
        def get_date(item):
            d = item.get("date")
            if hasattr(d, "timestamp"):
                return d.timestamp()
            if isinstance(d, str):
                try: return datetime.fromisoformat(d.replace("Z", "+00:00")).timestamp()
                except: return 0
            return 0

        # Sort by date descending
        results.sort(key=get_date, reverse=True)
        
        # Filtering by date in memory
        if date_from:
            results = [r for r in results if str(r.get("date", "")) >= date_from]
        if date_to:
            results = [r for r in results if str(r.get("date", "")) <= date_to]

        # Pagination
        offset = (page - 1) * page_size
        return results[offset : offset + page_size]
    except Exception as e:
        import traceback
        print(f"❌ Error in list_journals: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/journals/{journal_id}")
async def get_journal(journal_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = db.collection("journal_entries").document(journal_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return {"id": doc.id, **doc.to_dict()}

@router.get("/suppliers")
async def list_suppliers(
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    try:
        db = get_db()
        company_id = user.get("company_id")
        docs = db.collection("suppliers").where("company_id", "==", company_id).stream()
        
        results = [dict({"id": doc.id, **doc.to_dict()}) for doc in docs]
        if search:
            s = search.lower()
            results = [r for r in results if s in r.get("name", "").lower()]
            
        return {"suppliers": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
