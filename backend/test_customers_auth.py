import requests

def test_customers():
    url = "http://localhost:3000/api/customers"
    headers = {"Authorization": "Bearer test_token"}
    try:
        print(f"Testing {url}...")
        resp = requests.get(url, headers=headers)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_customers()
