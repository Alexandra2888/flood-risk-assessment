"""
Clerk JWT verification service
Handles Clerk authentication token verification
"""
import httpx
import jwt
from typing import Optional, Dict, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class ClerkService:
    """Service for Clerk JWT verification and user data retrieval"""
    
    def __init__(self):
        self.base_url = "https://api.clerk.com/v1"
        self.secret_key = settings.clerk_secret_key
        
    async def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Clerk JWT token and return user claims
        """
        try:
            # For now, we'll implement a simple verification
            # In production, you should use Clerk's proper JWT verification with public keys
            
            if not token:
                return None
                
            # Decode without verification for now (NOT SECURE FOR PRODUCTION)
            # In production, fetch and use Clerk's public keys for verification
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                
                # Basic validation
                if not payload.get('sub'):  # subject (user ID)
                    return None
                    
                return payload
                
            except jwt.InvalidTokenError as e:
                logger.error(f"Invalid JWT token: {e}")
                return None
                
        except Exception as e:
            logger.error(f"JWT verification error: {e}")
            return None
    
    async def get_user_from_clerk(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user data from Clerk API
        """
        if not self.secret_key:
            logger.error("Clerk secret key not configured")
            return None
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/users/{user_id}",
                    headers={
                        "Authorization": f"Bearer {self.secret_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to fetch user from Clerk: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching user from Clerk: {e}")
            return None
    
    def extract_user_data(self, clerk_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant user data from Clerk user object
        """
        email_addresses = clerk_user.get('email_addresses', [])
        primary_email = None
        
        for email in email_addresses:
            if email.get('id') == clerk_user.get('primary_email_address_id'):
                primary_email = email.get('email_address')
                break
        
        if not primary_email and email_addresses:
            primary_email = email_addresses[0].get('email_address')
        
        return {
            "clerkId": clerk_user.get('id'),
            "email": primary_email or "",
            "firstName": clerk_user.get('first_name'),
            "lastName": clerk_user.get('last_name'),
            "imageUrl": clerk_user.get('image_url'),
            "lastSignInAt": clerk_user.get('last_sign_in_at')
        }

# Singleton instance
clerk_service = ClerkService()
