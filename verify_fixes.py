import requests
import json
from datetime import datetime

BASE = "http://127.0.0.1:8000/api"

print("=" * 50)
print("🧪 OpenGate ERP Critical Fix Verification")
print("=" * 50)

# Test 1: Dashboard Stats
print("\n1. Testing Dashboard Stats...")
try:
    res = requests.get(f"{BASE}/reports/dashboard", timeout=10)
    if res.status_code == 200:
        data = res.json()
        print(f"   ✅ Dashboard OK: Cash={data.get('cashBalance', 'N/A')}, Sales={data.get('todaySales', 'N/A')}")
    else:
        print(f"   ❌ Dashboard FAILED: {res.status_code} - {res.text[:100]}")
except Exception as e:
    print(f"   ❌ Dashboard ERROR: {e}")

# Test 2: Trial Balance
print("\n2. Testing Trial Balance...")
try:
    res = requests.get(f"{BASE}/reports/trial-balance", timeout=10)
    if res.status_code == 200:
        data = res.json()
        print(f"   ✅ Trial Balance OK: {len(data)} accounts returned")
    else:
        print(f"   ❌ Trial Balance FAILED: {res.status_code}")
except Exception as e:
    print(f"   ❌ Trial Balance ERROR: {e}")

# Test 3: Balance Sheet
print("\n3. Testing Balance Sheet...")
try:
    res = requests.get(f"{BASE}/reports/balance-sheet", timeout=10)
    if res.status_code == 200:
        data = res.json()
        print(f"   ✅ Balance Sheet OK: Assets={data.get('total_assets', 'N/A')}")
    else:
        print(f"   ❌ Balance Sheet FAILED: {res.status_code}")
except Exception as e:
    print(f"   ❌ Balance Sheet ERROR: {e}")

# Test 4: CSV Export
print("\n4. Testing CSV Export...")
try:
    res = requests.get(f"{BASE}/reports/export/trial-balance", timeout=15)
    if res.status_code == 200 and "text/csv" in res.headers.get("Content-Type", ""):
        print(f"   ✅ CSV Export OK: Downloaded {len(res.text)} bytes")
    else:
        print(f"   ❌ CSV Export FAILED: {res.status_code} - {res.headers.get('Content-Type')}")
except Exception as e:
    print(f"   ❌ CSV Export ERROR: {e}")

# Test 5: Create Journal Entry (the critical test)
print("\n5. Testing Journal Entry Creation...")
try:
    test_je = {
        "number": f"JE-TEST-{datetime.now().strftime('%H%M%S')}",
        "description": "Test Journal Entry",
        "lines": [
            {"account_id": "test_acc", "debit": "100.00", "credit": "0.00", "description": "Debit"},
            {"account_id": "test_acc2", "debit": "0.00", "credit": "100.00", "description": "Credit"}
        ]
    }
    res = requests.post(f"{BASE}/accounting/journal-entry", json=test_je, timeout=10)
    if res.status_code == 200:
        print(f"   ✅ Journal Entry OK: {res.json()}")
    else:
        print(f"   ❌ Journal Entry FAILED: {res.status_code} - {res.text[:200]}")
except Exception as e:
    print(f"   ❌ Journal Entry ERROR: {e}")

print("\n" + "=" * 50)
print("🏁 Verification Complete")
