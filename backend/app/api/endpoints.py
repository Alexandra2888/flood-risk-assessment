from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import anthropic
from app.core.config import settings
from app.core.auth import get_current_user, get_current_user_optional
from app.models.schemas import User, TokenVerificationRequest, TokenVerificationResponse, ApiResponse
import aiofiles
import os
from PIL import Image
import io
import base64
from pydantic import BaseModel

class CoordinateRequest(BaseModel):
    latitude: float
    longitude: float

router = APIRouter()

_anthropic_client: Optional[anthropic.Anthropic] = None

def get_anthropic_client() -> Optional[anthropic.Anthropic]:
    global _anthropic_client
    if _anthropic_client is None and settings.anthropic_api_key:
        _anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client

@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Flood Risk Assessment API is running",
        "google_ai_configured": bool(settings.google_api_key),
        "api_key_length": len(settings.google_api_key) if settings.google_api_key else 0
    }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "flood-risk-assessment-api"}

@router.get("/test")
async def test_connection():
    """Test endpoint for debugging"""
    return {
        "message": "API connection successful",
        "timestamp": "2024-01-01T00:00:00Z",
        "status": "connected"
    }

@router.get("/models")
async def list_available_models():
    """List available AI models"""
    return {
        "available_models": [{"name": "claude-sonnet-4-20250514", "provider": "anthropic"}],
        "total_count": 1,
        "api_key_configured": bool(settings.anthropic_api_key)
    }

@router.post("/verify-token")
async def verify_token(request: TokenVerificationRequest):
    """
    Verify authentication token
    """
    try:
        from app.core.auth import verify_token_with_frontend
        
        user = await verify_token_with_frontend(request.token)
        
        if not user:
            return TokenVerificationResponse(
                valid=False,
                error="Invalid or expired token"
            )
        
        return TokenVerificationResponse(
            valid=True,
            user=user
        )
        
    except Exception as e:
        return TokenVerificationResponse(
            valid=False,
            error=f"Token verification failed: {str(e)}"
        )

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return ApiResponse(
        success=True,
        data=current_user.dict(),
        message="User information retrieved successfully"
    )

@router.post("/analyze/coordinates")
async def analyze_flood_risk_coordinates(
    request: CoordinateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze flood risk based on coordinates
    """
    try:
        lat = request.latitude
        lng = request.longitude
        
        # Validate coordinates
        if lat < -90 or lat > 90 or lng < -180 or lng > 180:
            raise HTTPException(status_code=400, detail="Invalid coordinates")
        
        # Mock analysis - in a real app, this would call external APIs
        # for elevation data, water proximity, etc.
        
        # Simple risk calculation based on coordinates
        # This is a mock implementation - replace with real data sources
        risk_level = "Medium"  # Default
        if lat > 45:  # Northern latitudes
            risk_level = "Low"
        elif lat < 30:  # Southern latitudes
            risk_level = "High"
        
        # Mock elevation (replace with real elevation API)
        elevation = 100 + (lat * 10) + (lng * 5)
        
        # Mock distance from water (replace with real water proximity API)
        distance_from_water = abs(lat) + abs(lng)
        
        # Mock AI analysis
        ai_analysis = f"Location at coordinates ({lat}, {lng}) shows {risk_level.lower()} flood risk. "
        ai_analysis += f"Elevation: {elevation:.1f}m, Distance from water: {distance_from_water:.1f}km."
        
        return {
            "risk_level": risk_level,
            "description": f"Flood risk assessment for coordinates ({lat}, {lng})",
            "recommendations": [
                "Monitor local weather conditions",
                "Check flood zone maps",
                "Consider elevation-based construction",
                "Implement proper drainage systems"
            ],
            "elevation": round(elevation, 1),
            "distance_from_water": round(distance_from_water, 1),
            "ai_analysis": ai_analysis
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing coordinates: {str(e)}")

@router.post("/analyze/image")
async def analyze_flood_risk_image(
    file: UploadFile = File(...),
    location: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Analyze an image for flood risk assessment using Anthropic Claude"""
    try:
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        contents = await file.read()
        client = get_anthropic_client()

        if not client:
            return {
                "risk_level": "Medium",
                "description": f"Manual analysis of {file.filename}",
                "recommendations": [
                    "AI analysis not available — ANTHROPIC_API_KEY not configured",
                    "Consider professional assessment",
                    "Check local flood maps"
                ],
                "elevation": 0,
                "distance_from_water": 0,
                "ai_analysis": "AI analysis not available — API key not configured"
            }

        media_type = file.content_type or "image/jpeg"
        image_b64 = base64.b64encode(contents).decode("utf-8")

        prompt = (
            "Analyze this image for flood risk assessment. "
            "Consider factors like terrain and elevation, water bodies and drainage patterns, "
            "vegetation and land use, infrastructure and buildings. "
            f"Location context: {location or 'Not specified'}. "
            "Provide a detailed risk assessment with: "
            "1. Risk level (exactly one of: Low, Medium, High, or Very High) — state it clearly on its own line like 'Risk Level: High' "
            "2. Key risk factors "
            "3. Specific recommendations"
        )

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )

        analysis = message.content[0].text

        risk_level = "Medium"
        analysis_lower = analysis.lower()
        if "very high" in analysis_lower:
            risk_level = "Very High"
        elif "risk level: high" in analysis_lower or "**high**" in analysis_lower:
            risk_level = "High"
        elif "risk level: low" in analysis_lower or "**low**" in analysis_lower:
            risk_level = "Low"
        elif "risk level: medium" in analysis_lower or "**medium**" in analysis_lower:
            risk_level = "Medium"

        return {
            "risk_level": risk_level,
            "description": f"AI analysis of {file.filename}",
            "recommendations": [
                "Review AI analysis results",
                "Consider professional assessment",
                "Check local flood maps",
                "Monitor weather conditions"
            ],
            "elevation": 0,
            "distance_from_water": 0,
            "ai_analysis": analysis
        }

    except anthropic.APIError as e:
        print(f"Anthropic API error: {e}")
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {str(e)}")
    except Exception as e:
        print(f"Image analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")

@router.get("/risk-factors")
async def get_risk_factors():
    """Get common flood risk factors"""
    return {
        "risk_factors": [
            "Elevation and topography",
            "Proximity to water bodies",
            "Drainage patterns",
            "Soil type and permeability",
            "Land use and vegetation",
            "Infrastructure density",
            "Historical flood data",
            "Climate and weather patterns"
        ]
    }

@router.post("/manual-assessment")
async def create_manual_assessment(
    location: str,
    elevation: float,
    water_proximity: str,
    soil_type: str,
    risk_level: str,
    current_user: User = Depends(get_current_user)
):
    """Create a manual flood risk assessment"""
    return {
        "location": location,
        "assessment": {
            "elevation": elevation,
            "water_proximity": water_proximity,
            "soil_type": soil_type,
            "risk_level": risk_level,
            "timestamp": "2024-01-01T00:00:00Z",
            "created_by": current_user.email
        }
    }
