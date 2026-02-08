# OpenGate ERP 🚀

OpenGate ERP is a modern, high-performance Enterprise Resource Planning system designed for Iraqi compliance and international scalability. Built with **Next.js**, **FastAPI**, and **Firebase**, it provides a seamless, real-time experience for managing Accounting, Inventory, and Business Intelligence.

---

## 🌟 Key Features

- **Accounting**: Full-featured General Ledger with Trial Balance, Income Statement, and Balance Sheet (O(1) performance).
- **Inventory**: Multi-warehouse tracking, WAC valuation, and real-time stock auditing (Bin Cards).
- **Sales & Procurement**: End-to-end document lifecycle (Quotation -> Sales Order -> Delivery Note).
- **Security & RBAC**: Granular role-based access control (Admin, Accountant, Storekeeper, Viewer).
- **Audit Trails**: Immutable logs for every transaction and state change.
- **Multilingual**: Automatic RTL/LTR support for English and Arabic.
- **Multi-Currency**: Native support for USD and IQD transactions.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14+, Tailwind CSS, Recharts, Framer Motion.
- **Backend**: FastAPI (Python 3.11), Uvicorn.
- **Database**: Google Cloud Firestore (Serverless).
- **Auth**: Firebase Authentication.
- **Deployment**: Google Cloud Run (Backend), Vercel (Frontend).

---

## 🚀 Deployment Guide (Step-by-Step)

### 1. Backend Deployment (Option A: Render - FREE & EASIEST)
Render is the easiest way to get the backend live for free.

1.  Create a free account at **[Render.com](https://render.com)**.
2.  Click **"New +"** -> **"Web Service"**.
3.  Connect your GitHub repository `opengate_ERP`.
4.  **Settings**:
    *   **Name**: `opengate-erp-backend`
    *   **Runtime**: `Docker`
    *   **Docker Context**: `backend`
    *   **Dockerfile Path**: `Dockerfile`
5.  **Environment Variables**:
    *   Add `FIREBASE_SERVICE_ACCOUNT`: (Paste raw JSON from `service_account.json`).
6.  **Deploy**: Render will build the Docker image and host it. 
    *   *Note: Free instances spin down after 15m of inactivity.*

### 2. Backend Deployment (Option B: Google Cloud Run)
Best for production stability.

1.  **Preparation**: Ensure your `service_account.json` is ready.
2.  **GCP Console**: Go to **[Cloud Run](https://console.cloud.google.com/run)**.
3.  **Deploy new service**: 
    *   **Source**: Select "Continuously deploy from a repository".
    *   **GitHub**: Connect your `opengate_ERP` repo.
    *   **Build Settings**:
        *   Context: `backend`
        *   Dockerfile: `backend/Dockerfile`
4.  **Security (Environment Variables)**:
    *   Go to **Variables & Secrets**.
    *   Add variable `FIREBASE_SERVICE_ACCOUNT`.
    *   **Value**: Paste the *entire* raw JSON content of your `service_account.json`.
5.  **Performance**: Set "Minimum instances" to `1` if you want to avoid cold starts.

### 2. Frontend Deployment (Vercel)
Vercel is the best platform for Next.js applications.

1.  **Vercel Dashboard**: Go to [vercel.com](https://vercel.com).
2.  **Add New Project**: Import the `opengate_ERP` repository.
3.  **Project Settings**:
    *   **Framework**: Next.js.
    *   **Root Directory**: Set to `frontend`.
4.  **Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: Paste your **Cloud Run Service URL** (e.g., `https://api-xxx-uc.a.run.app`).
    *   Add your Firebase client keys (from Local `.env`):
        *   `NEXT_PUBLIC_FIREBASE_API_KEY`
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
        *   ...etc.
5.  **Deploy**: Click Deploy.

---

## 💻 Local Development

### Backend (Python)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

---

## 📄 License
Commercial / Private - All Rights Reserved.
Developed for hxcsa.
