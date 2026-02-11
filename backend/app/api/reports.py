
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
    from_date: str,
    to_date: str,
    user: dict = Depends(get_current_user)
):
    try:
        # Flexible Parsing
        try:
            start = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except:
            start = datetime.strptime(from_date, "%Y-%m-%d")
            
        try:
            end = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        except:
            # Set to end of day if only date provided
            from datetime import time
            d = datetime.strptime(to_date, "%Y-%m-%d")
            end = datetime.combine(d.date(), time(23, 59, 59))

        service = ReportingService()
        return await service.get_customer_statement(user["company_id"], customer_id, start, end)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Log error
        print(f"Error generating statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))
