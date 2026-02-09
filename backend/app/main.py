from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router as api_router
from app.core.firebase import init_firebase

app = FastAPI(title="Iraqi ERP API (Firebase)", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, you might want to restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_firebase()

@app.get("/")
async def root():
    return {"message": "Welcome to Iraqi ERP API (Firebase)"}

app.include_router(api_router, prefix="/api")
