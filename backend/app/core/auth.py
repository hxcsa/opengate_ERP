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
        # Extract custom claims directly from the token (Optimized: No DB fetch!)
        uid = decoded_token["uid"]
        role = decoded_token.get("role", "viewer")
        company_id = decoded_token.get("company_id")
        
        # Add to the returned token for convenience
        decoded_token.update({
            "role": role,
            "company_id": company_id
        })
            
        return decoded_token
    except Exception as e:
        print(f"[Auth] Error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")