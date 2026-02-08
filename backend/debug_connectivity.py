import os
# Force native DNS resolver for GRPC to avoid hanging
os.environ["GRPC_DNS_RESOLVER"] = "native"

import firebase_admin
from firebase_admin import credentials, firestore
import time

print("Starting connectivity test...")
cred_path = "service_account.json"

if not os.path.exists(cred_path):
    print(f"ERROR: {cred_path} not found")
    exit(1)

try:
    print("Initializing Firebase app...")
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    print("Firebase app initialized.")
    
    print("Getting Firestore client...")
    db = firestore.client()
    print("Firestore client obtained.")
    
    print("Testing connection to 'accounts' collection...")
    start = time.time()
    docs = list(db.collection("accounts").limit(5).stream())
    end = time.time()
    
    print(f"Connection successful! Retrieved {len(docs)} docs in {end - start:.2f}s")
    
    print("Testing connection to 'users' collection...")
    start = time.time()
    docs = list(db.collection("users").limit(5).stream())
    end = time.time()
    print(f"Connection successful! Retrieved {len(docs)} docs in {end - start:.2f}s")

except Exception as e:
    print(f"EXCEPTION: {e}")
