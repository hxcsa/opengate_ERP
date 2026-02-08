import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_endpoints():
    endpoints = [
        "/reports/dashboard",
        "/reports/trial-balance",
        "/reports/income-statement",
        "/reports/balance-sheet",
        "/reports/inventory-valuation",
        "/inventory/items"
    ]
    
    for ep in endpoints:
        print(f"Testing {ep}...")
        try:
            res = requests.get(f"{BASE_URL}{ep}")
            if res.status_code == 200:
                print(f"  OK: {json.dumps(res.json())[:100]}...")
            else:
                print(f"  FAILED: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"  ERROR: {e}")

if __name__ == "__main__":
    test_endpoints()
