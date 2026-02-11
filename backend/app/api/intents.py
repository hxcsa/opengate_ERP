from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from google.cloud import firestore
from app.core.firebase import get_db
from app.core.auth import get_current_user
from app.schemas.erp import (
    IntentCreate, Intent, IntentStatus
)
from datetime import datetime

router = APIRouter()

@router.get("", response_model=List[Intent])
async def list_intents(
    page: int = 1,
    limit: int = 10,
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_db()
    company_id = user.get("company_id")
    
    query = db.collection("intents").where("company_id", "==", company_id)
    
    if client_id:
        query = query.where("client_id", "==", client_id)
    if status:
        query = query.where("status", "==", status)
        
    # Standardize on in-memory sorting to avoid index requirements for now
    docs = query.stream()
    intents = []
    for doc in docs:
        data = doc.to_dict()
        intents.append({"id": doc.id, **data})
        
    def get_created_at(it):
        dt = it.get("created_at")
        if hasattr(dt, "timestamp"):
            return dt.timestamp()
        if isinstance(dt, str):
            try: return datetime.fromisoformat(dt.replace("Z", "+00:00")).timestamp()
            except: return 0
        return 0

    intents.sort(key=get_created_at, reverse=True)
    
    # Apply pagination in memory for reliability
    offset = (page - 1) * limit
    return intents[offset : offset + limit]

@router.post("", response_model=Intent)
async def create_intent(data: IntentCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    company_id = user.get("company_id")
    
    intent_data = data.model_dump()
    intent_data.update({
        "company_id": company_id,
        "created_at": datetime.utcnow(),
        "status": intent_data.get("status") or IntentStatus.REQUESTED
    })
    
    doc_ref = db.collection("intents").document()
    doc_ref.set(intent_data)
    
    return {"id": doc_ref.id, **intent_data}

@router.put("/{intent_id}/status")
async def update_intent_status(
    intent_id: str, 
    status: IntentStatus, 
    user: dict = Depends(get_current_user)
):
    db = get_db()
    company_id = user.get("company_id")
    
    doc_ref = db.collection("intents").document(intent_id)
    doc = doc_ref.get()
    
    if not doc.exists or doc.to_dict().get("company_id") != company_id:
        raise HTTPException(status_code=404, detail="Intent not found")
        
    doc_ref.update({"status": status})
    return {"status": "success"}
