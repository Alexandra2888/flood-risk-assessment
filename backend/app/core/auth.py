from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.schemas import User
from app.services.database import database_service
from app.services.clerk_service import clerk_service
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

async def verify_clerk_token(token: str) -> Optional[User]:
    """
    Verify Clerk JWT token and return user
    """
    try:
        # Verify JWT token with Clerk
        token_payload = await clerk_service.verify_jwt_token(token)
        if not token_payload:
            return None
        
        clerk_user_id = token_payload.get('sub')
        if not clerk_user_id:
            return None
        
        # Get user from our database first
        user = await database_service.get_user_by_clerk_id(clerk_user_id)
        
        # If user doesn't exist in our DB, fetch from Clerk and create
        if not user:
            clerk_user_data = await clerk_service.get_user_from_clerk(clerk_user_id)
            if clerk_user_data:
                user_data = clerk_service.extract_user_data(clerk_user_data)
                user = await database_service.upsert_user(user_data)
        
        return user
        
    except Exception as e:
        logger.error(f"Clerk token verification error: {e}")
        return None

async def verify_app_token(token: str) -> Optional[User]:
    """
    Verify our internal app token
    """
    try:
        return await database_service.verify_token(token)
    except Exception as e:
        logger.error(f"App token verification error: {e}")
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user - supports both Clerk JWT and app tokens"""
    token = credentials.credentials
    
    # Try app token first (our internal tokens)
    user = await verify_app_token(token)
    
    # If app token fails, try Clerk JWT
    if not user:
        user = await verify_clerk_token(token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[User]:
    """Get current user, return None if not authenticated"""
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None