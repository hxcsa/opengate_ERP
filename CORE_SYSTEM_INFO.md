# ERP System: Core Identity & Troubleshooting

This document contains critical system configuration details to ensure data visibility and user authentication consistency across the ERP.

## 🔑 Your Active Identity
- **Current Company ID**: `OPENGATE_CORP`
- **Identity Enforcement**: **UPPERCASE** (All caps)
- **Role**: `admin`

---

## 🏗️ Multi-Tenant Architecture
The system uses a **"Shared Cabinet, Locked Drawers"** model. 
1. **The Database**: All records (accounts, invoices, inventory) are stored in the same place.
2. **The Key**: Every record is stamped with a `company_id`.
3. **The Lock**: When you fetch data, the server checks your **ID Token** (the "Digital ID Card"). 
   - If your token says `OPENGATE_CORP`, the server ONLY shows documents where `company_id == "OPENGATE_CORP"`.
   - Creating a new business like `BLACKSTAR_LTD` would simply require an admin account with that specific ID.

---

## 🆘 Troubleshooting: "Why are my accounts missing?"
If you or a teammate log in and see 0 accounts despite data being in the system, check for these two common issues:

### 1. Case Sensitivity (Most Common)
Firestore is strictly case-sensitive. 
- **WRONG**: `opengate_corp` or `Opengate_Corp`
- **RIGHT**: `OPENGATE_CORP`
If any record or user claim is lowercase, the data will become invisible to the UI.

### 2. Custom Claims Not Set
New users created manually or via Firebase Console often start with **EMPTY** Custom Claims.
- **Problem**: The user has an email/password, but no "Digital ID Card" (Token) stating which company they belong to.
- **Solution**: A script must be run (or an admin portal used) to set the `company_id` and `role` claims on the user's Auth profile.

### 3. Token Out of Sync
Sometimes the browser holds an old "ID Card" even after we fix the backend.
- **Solution**: Logout and Login again, or wait for the token to auto-refresh (usually 1 hour).

---

## 🛠️ System Maintenance
If you ever need to migrate or check the system integrity again, look for the standard Iraqi COA seeding logic in `backend/app/services/seeding.py`. Remember that manual syncing of the `company_id` is the key to restoring data visibility.
