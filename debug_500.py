
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    print("Importing AccountingService...")
    from app.services.accounting import AccountingService
    
    print("Initializing AccountingService...")
    service = AccountingService()
    
    print("Calling get_accounts...")
    # Mock company_id (use a real one if known, or just a string)
    accounts = service.get_accounts("test_company_id")
    print(f"Success! Retrieved {len(accounts)} accounts.")
    
except Exception as e:
    print("\nXXX CAUGHT EXCEPTION XXX")
    print(e)
    import traceback
    traceback.print_exc()

try:
    print("\nImporting CustomersService...")
    from app.services.customers import CustomersService
    # Mock user dict
    user = {"company_id": "test_company_id", "role": "admin", "uid": "test_uid"}
    service = CustomersService(user)
    print("Calling list_customers...")
    customers = service.list_customers()
    print(f"Success! Retrieved {customers.get('total_count')} customers.")
    
except Exception as e:
    print("\nXXX CAUGHT EXCEPTION IN CUSTOMERS XXX")
    print(e)
    import traceback
    traceback.print_exc()
