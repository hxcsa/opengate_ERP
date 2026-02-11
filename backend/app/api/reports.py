
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime
from app.core.auth import get_current_user
from app.services.reporting import ReportingService

router = APIRouter()

@router.get("/trial-balance")
async def get_trial_balance(
    as_of: Optional[datetime] = None,
    user: dict = Depends(get_current_user)
):
    try:
        service = ReportingService()
        return await service.get_trial_balance(user["company_id"], as_of)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customer-statement")
async def get_customer_statement(
    customer_id: str,
    from_date: datetime,
    to_date: datetime,
    user: dict = Depends(get_current_user)
):
    try:
        service = ReportingService()
        # Ensure to_date covers the whole day
        return await service.get_customer_statement(user["company_id"], customer_id, from_date, to_date)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Log error
        print(f"Error generating statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))
