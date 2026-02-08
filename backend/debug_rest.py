import google.auth
from google.oauth2 import service_account
from google.auth.transport.requests import Request
import requests
import os
import json

print("Testing Firestore REST API...")

cred_path = "service_account.json"
if not os.path.exists(cred_path):
    print("Error: service_account.json not found")
    exit(1)

try:
    # Load credentials
    creds = service_account.Credentials.from_service_account_file(
        cred_path,
        scopes=["https://www.googleapis.com/auth/datastore"]
    )
    
    # Refresh token
    creds.refresh(Request())
    token = creds.token
    print("Access token obtained via REST.")
    
    # Get project ID
    with open(cred_path) as f:
        project_id = json.load(f)["project_id"]
        
    print(f"Project ID: {project_id}")
    
    # Call Firestore REST API
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/accounts?pageSize=5"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"GET {url}")
    resp = requests.get(url, headers=headers)
    
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print("Success! Firestore accessible via REST.")
        data = resp.json()
        print(f"Documents found: {len(data.get('documents', []))}")
    else:
        print(f"Error: {resp.text}")

except Exception as e:
    print(f"EXCEPTION: {e}")
