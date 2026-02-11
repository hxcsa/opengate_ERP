from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.auth import get_current_user
from app.schemas.expenses import ExpenseCreate
from app.services.expenses import ExpenseService

router = APIRouter()

def get_service():
    return ExpenseService()

@router.get("")
@router.get("/")
async def list_expenses(user: dict = Depends(get_current_user)):
    service = get_service()
    return service.list_expenses(user["company_id"])

@router.post("")
@router.post("/")
async def create_expense(data: ExpenseCreate, user: dict = Depends(get_current_user)):
    try:
        service = get_service()
        exp_id = service.create_expense(data, user)
        return {"status": "success", "id": exp_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
