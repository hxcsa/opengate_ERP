import os
import sys
from datetime import datetime
from app.core.firebase import get_db
from app.services.reporting import ReportingService

async def test_statement():
    service = ReportingService()
    company_id = "OPENGATE_CORP"
    customer_id = "SRtTZBV2G2tUydpMRA8y"
    from_date = datetime(2026, 2, 1)
    to_date = datetime(2026, 2, 11)
    
    try:
        print(f"Testing statement for {customer_id}...")
        res = await service.get_customer_statement(company_id, customer_id, from_date, to_date)
        print("SUCCESS")
        print(res)
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_statement())
