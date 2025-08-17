from fastapi import APIRouter
from app.api.endpoints import router as endpoints_router
from app.api.user_endpoints import router as user_router

# Create main API router
api_router = APIRouter(prefix="/api/v1")

# Include endpoints
api_router.include_router(endpoints_router, tags=["flood-risk-assessment"])
api_router.include_router(user_router, tags=["user-management"])
