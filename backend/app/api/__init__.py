from fastapi import APIRouter
from app.api.endpoints import router as endpoints_router

# Create main API router
api_router = APIRouter(prefix="/api/v1")

# Include endpoints
api_router.include_router(endpoints_router, tags=["flood-risk-assessment"])
