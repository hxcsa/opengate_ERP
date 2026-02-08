from fastapi import FastAPI
from app.api import router as api_router
from app.core.firebase import init_firebase

app = FastAPI(title="Iraqi ERP API (Firebase)", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    init_firebase()

@app.get("/")
async def root():
    return {"message": "Welcome to Iraqi ERP API (Firebase)"}

app.include_router(api_router, prefix="/api")
