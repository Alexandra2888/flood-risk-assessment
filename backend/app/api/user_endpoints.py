"""
Clean user management endpoints
Follows RESTful principles and SOLID design patterns
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional
from app.models.schemas import User, UserToken, ApiResponse
from app.services.database import database_service
from app.services.clerk_service import clerk_service
from app.core.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

# Request/Response models
class SyncUserRequest(BaseModel):
    """Request model for user synchronization"""
    clerkId: str = Field(..., description="Clerk user ID")
    email: str = Field(..., description="User email")
    firstName: Optional[str] = Field(None, description="First name")
    lastName: Optional[str] = Field(None, description="Last name")
    imageUrl: Optional[str] = Field(None, description="Profile image URL")
    lastSignInAt: Optional[str] = Field(None, description="Last sign in timestamp")

class GenerateTokenRequest(BaseModel):
    """Request model for token generation"""
    clerkId: str = Field(..., description="Clerk user ID")
    expiresInMinutes: Optional[int] = Field(1440, description="Token expiration in minutes")

class AuthenticatedUserResponse(BaseModel):
    """Response model for authenticated user with token"""
    user: User
    token: str
    expiresAt: str

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/sync-user", response_model=ApiResponse[User])
async def sync_user(request: SyncUserRequest):
    """
    Synchronize user with local database
    Creates or updates user based on Clerk data
    """
    try:
        logger.info(f"Syncing user: {request.email}")
        
        # Validate required fields
        if not request.clerkId or not request.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ClerkId and email are required"
            )
        
        # Convert request to dict for database service
        user_data = {
            "clerkId": request.clerkId,
            "email": request.email,
            "firstName": request.firstName,
            "lastName": request.lastName,
            "imageUrl": request.imageUrl,
            "lastSignInAt": request.lastSignInAt
        }
        
        # Upsert user in database
        user = await database_service.upsert_user(user_data)
        
        return ApiResponse[User](
            success=True,
            data=user,
            message="User synchronized successfully"
        )
        
    except Exception as e:
        logger.error(f"Error syncing user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync user: {str(e)}"
        )

@router.post("/generate-token", response_model=ApiResponse[AuthenticatedUserResponse])
async def generate_token(request: GenerateTokenRequest):
    """
    Generate authentication token for user
    """
    try:
        logger.info(f"Generating token for user: {request.clerkId}")
        
        # Get user from database
        user = await database_service.get_user_by_clerk_id(request.clerkId)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found. Please sync user first."
            )
        
        # Clean up expired tokens
        await database_service.cleanup_expired_tokens()
        
        # Validate expiration time (max 7 days)
        expires_in_minutes = min(request.expiresInMinutes or 1440, 10080)
        
        # Create token
        user_token = await database_service.create_user_token(
            user_id=user.id,
            clerk_id=request.clerkId,
            expires_in_minutes=expires_in_minutes
        )
        
        authenticated_user = AuthenticatedUserResponse(
            user=user,
            token=user_token.token,
            expiresAt=user_token.expiresAt
        )
        
        return ApiResponse[AuthenticatedUserResponse](
            success=True,
            data=authenticated_user,
            message="Token generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate token: {str(e)}"
        )

@router.get("/token", response_model=ApiResponse[AuthenticatedUserResponse])
async def get_existing_token(current_user: User = Depends(get_current_user)):
    """
    Get existing valid token for authenticated user
    """
    try:
        # Get existing valid token
        user_token = await database_service.get_valid_token(current_user.clerkId)
        
        if not user_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No valid token found"
            )
        
        authenticated_user = AuthenticatedUserResponse(
            user=current_user,
            token=user_token.token,
            expiresAt=user_token.expiresAt
        )
        
        return ApiResponse[AuthenticatedUserResponse](
            success=True,
            data=authenticated_user,
            message="Token retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get token: {str(e)}"
        )

@router.get("/me", response_model=ApiResponse[User])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return ApiResponse[User](
        success=True,
        data=current_user,
        message="User information retrieved successfully"
    )

@router.post("/verify-token", response_model=ApiResponse)
async def verify_token_endpoint(token: str):
    """
    Verify authentication token
    """
    try:
        user = await database_service.verify_token(token)
        
        if not user:
            return ApiResponse(
                success=False,
                error="Invalid or expired token"
            )
        
        return ApiResponse(
            success=True,
            data={"user": user.dict()},
            message="Token is valid"
        )
        
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        return ApiResponse(
            success=False,
            error=f"Token verification failed: {str(e)}"
        )
