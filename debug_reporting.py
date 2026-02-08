import asyncio
import traceback
from app.services.reporting import ReportingService

async def debug_reporting():
    service = ReportingService()
    print("Testing get_dashboard_stats...")
    try:
        res = await service.get_dashboard_stats()
        print(f"Result: {res}")
    except Exception:
        print("Traceback for get_dashboard_stats:")
        traceback.print_exc()

    print("\nTesting get_trial_balance...")
    try:
        res = await service.get_trial_balance()
        print(f"Result length: {len(res)}")
    except Exception:
        print("Traceback for get_trial_balance:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_reporting())
