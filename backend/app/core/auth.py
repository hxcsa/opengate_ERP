from fastapi import Request, HTTPException
from firebase_admin import auth
from app.core.firebase import get_db

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    
    # VERBOSE LOGGING for debugging 401s
    path = request.url.path
    print(f"🔑 [Auth] {request.method} {path} | Header present: {bool(auth_header)}")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        print(f"❌ [Auth] REJECTED {path}: No Authorization header or not Bearer format")
        raise HTTPException(status_code=401, detail="MISSING_HEADER: No Bearer token in Authorization header")
    
    id_token = auth_header.split(" ")[1]
    
    # Check token is not empty or obviously invalid
    if len(id_token) < 100:
        print(f"❌ [Auth] REJECTED {path}: Token too short ({len(id_token)} chars)")
        raise HTTPException(status_code=401, detail=f"INVALID_TOKEN: Token too short ({len(id_token)} chars)")
    
    try:
        # Verify the JWT
        decoded_token = auth.verify_id_token(id_token, check_revoked=False)
        
        uid = decoded_token.get("uid") or decoded_token.get("sub")
        email = decoded_token.get("email")
        print(f"✅ [Auth] VERIFIED {path}: {email} ({uid})")

        # Extract custom claims directly from the token
        role = decoded_token.get("role", "viewer")
        company_id = decoded_token.get("company_id")
        
        # Add to the returned token for convenience
        decoded_token.update({
            "role": role,
            "company_id": company_id
        })
            
        return decoded_token
    except auth.ExpiredIdTokenError:
        print(f"❌ [Auth] REJECTED {path}: Token EXPIRED")
        raise HTTPException(status_code=401, detail="TOKEN_EXPIRED: Firebase token has expired. Please re-login.")
    except auth.InvalidIdTokenError as e:
        print(f"❌ [Auth] REJECTED {path}: Token INVALID: {str(e)}")
        raise HTTPException(status_code=401, detail=f"TOKEN_INVALID: {str(e)}")
    except auth.RevokedIdTokenError:
        print(f"❌ [Auth] REJECTED {path}: Token REVOKED")
        raise HTTPException(status_code=401, detail="TOKEN_REVOKED: Token has been revoked")
    except Exception as e:
        print(f"❌ [Auth] REJECTED {path}: UNKNOWN ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"AUTH_ERROR: {type(e).__name__}: {str(e)}")