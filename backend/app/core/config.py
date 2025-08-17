from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Application settings"""
    
    # Server settings
    app_name: str = "Flood Risk Assessment API"
    app_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    port: int = int(os.getenv("PORT", 8000))
    host: str = os.getenv("HOST", "0.0.0.0")
    
    # CORS settings - using string to avoid Pydantic JSON parsing issues
    _allowed_origins_str: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://flood-risk-assessment.onrender.com,https://flood-risk-assessment.vercel.app"
    
    @property
    def allowed_origins(self) -> List[str]:
        """Get allowed origins as a list"""
        # Check if environment variable is set
        env_origins = os.getenv("ALLOWED_ORIGINS")
        if env_origins:
            return [origin.strip() for origin in env_origins.split(',') if origin.strip()]
        
        # Use default value
        return [origin.strip() for origin in self._allowed_origins_str.split(',') if origin.strip()]
    
    # Frontend settings
    frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    
    # Google AI settings
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    
    # Clerk settings
    clerk_secret_key: str = os.getenv("CLERK_SECRET_KEY", "")
    clerk_publishable_key: str = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")
    
    # Security settings
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create settings instance
settings = Settings()
