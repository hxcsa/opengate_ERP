from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.auth import get_current_user
from app.schemas.credit_notes import CreditNoteCreate
from app.services.credit_notes import CreditNoteService

router = APIRouter()

def get_service():
    return CreditNoteService()

@router.get("")
@router.get("/")
async def list_credit_notes(user: dict = Depends(get_current_user)):
    service = get_service()
    return service.list_credit_notes(user["company_id"])

@router.post("")
@router.post("/")
async def create_credit_note(data: CreditNoteCreate, user: dict = Depends(get_current_user)):
    try:
        service = get_service()
        cn_id = service.create_credit_note(data, user)
        return {"status": "success", "id": cn_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
