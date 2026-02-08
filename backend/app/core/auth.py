from fastapi import Request, HTTPException
from firebase_admin import auth
from app.core.firebase import get_db

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    id_token = auth_header.split(" ")[1]
    try:
        # Verify the JWT with a reasonable timeout
        decoded_token = auth.verify_id_token(id_token, check_revoked=False)
        uid = decoded_token["uid"]
        
        # Fetch user profile from Firestore
        db = get_db()
        user_doc = db.collection("users").document(uid).get()
        
        if user_doc.exists:
            profile = user_doc.to_dict()
            role = profile.get("role", "viewer")
            company_id = profile.get("company_id")
            
            decoded_token.update({
                "role": role,
                "company_id": company_id
            })
        else:
            # No Firestore profile - default to viewer
            decoded_token.update({"role": "viewer", "company_id": None})
            
        return decoded_token
    except Exception as e:
        print(f"[Auth] Error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")