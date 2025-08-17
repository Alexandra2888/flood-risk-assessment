from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import requests
import os
from app.models.schemas import User, TokenVerificationResponse
from app.core.config import settings

# Security scheme
security = HTTPBearer()

def get_frontend_base_url() -> str:
    """Get the frontend base URL from settings"""
    return settings.frontend_base_url

async def verify_token_with_frontend(token: str) -> Optional[User]:
    """
    Verify token with the Next.js frontend API
    """
    try:
        frontend_url = get_frontend_base_url()
        response = requests.post(
            f"{frontend_url}/api/auth/verify-token",
            json={"token": token},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code != 200:
            return None
            
        result = response.json()
        if not result.get('success'):
            return None
            
        user_data = result.get('data', {}).get('user')
        if not user_data:
            return None
            
        return User(**user_data)
        
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> User:
    """
    Dependency to get the current authenticated user
    """
    if not credentials:
        raise HTTPException(
            status_code=401, 
            detail="Authorization header required"
        )
    
    user = await verify_token_with_frontend(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or expired token"
        )
    
    return user

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[User]:
    """
    Optional dependency to get the current authenticated user
    """
    if not credentials:
        return None
    
    return await verify_token_with_frontend(credentials.credentials)
