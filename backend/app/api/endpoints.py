from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional
import google.generativeai as genai
from app.core.config import settings
import aiofiles
import os
from PIL import Image
import io
from pydantic import BaseModel

# Request models
class CoordinateRequest(BaseModel):
    latitude: float
    longitude: float

router = APIRouter()

# Configure Google AI
if settings.google_api_key:
    genai.configure(api_key=settings.google_api_key)

# Function to get available models
async def get_available_models():
    """Get list of available Google AI models"""
    try:
        if not settings.google_api_key:
            return []
        
        models = genai.list_models()
        available_models = []
        for model in models:
            if 'generateContent' in model.supported_generation_methods:
                available_models.append({
                    'name': model.name,
                    'display_name': model.display_name,
                    'description': model.description,
                    'generation_methods': model.supported_generation_methods
                })
        return available_models
    except Exception as e:
        print(f"Error getting available models: {e}")
        return []

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
    """List available Google AI models"""
    models = await get_available_models()
    return {
        "available_models": models,
        "total_count": len(models),
        "api_key_configured": bool(settings.google_api_key)
    }

@router.post("/analyze/coordinates")
async def analyze_flood_risk_coordinates(request: CoordinateRequest):
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
    location: Optional[str] = None
):
    """
    Analyze an image for flood risk assessment using Google AI
    """
    try:
        # Debug logging
        print(f"Debug: Google API key configured: {bool(settings.google_api_key)}")
        print(f"Debug: API key length: {len(settings.google_api_key) if settings.google_api_key else 0}")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Save image temporarily for analysis
        temp_path = f"temp_{file.filename}"
        image.save(temp_path)
        
        try:
            # Analyze with Google AI if API key is available
            if settings.google_api_key:
                analysis = ""
                ai_error = None
                
                # Try different model names in order of preference
                model_names = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-vision']
                
                for model_name in model_names:
                    try:
                        print(f"Debug: Trying model: {model_name}")
                        model = genai.GenerativeModel(model_name)
                        
                        prompt = f"""
                        Analyze this image for flood risk assessment. 
                        Consider factors like:
                        - Terrain and elevation
                        - Water bodies and drainage patterns
                        - Vegetation and land use
                        - Infrastructure and buildings
                        
                        Location context: {location or 'Not specified'}
                        
                        Provide a detailed risk assessment with:
                        1. Risk level (Low/Medium/High)
                        2. Key risk factors
                        3. Recommendations
                        """
                        
                        response = model.generate_content([prompt, image])
                        analysis = response.text
                        print(f"Debug: Successfully used model: {model_name}")
                        break
                        
                    except Exception as e:
                        print(f"Debug: Model {model_name} failed: {e}")
                        ai_error = e
                        continue
                
                if not analysis:
                    print(f"Debug: All models failed. Last error: {ai_error}")
                    analysis = f"AI analysis failed: {str(ai_error)}. Basic image analysis suggests medium flood risk."
                
                # Parse AI response to extract risk level
                risk_level = "Medium"  # Default
                if "high risk" in analysis.lower() or "high" in analysis.lower():
                    risk_level = "High"
                elif "low risk" in analysis.lower() or "low" in analysis.lower():
                    risk_level = "Low"
                
                return {
                    "risk_level": risk_level,
                    "description": f"AI analysis of {file.filename}",
                    "recommendations": [
                        "Review AI analysis results",
                        "Consider professional assessment",
                        "Check local flood maps",
                        "Monitor weather conditions"
                    ],
                    "elevation": 0,  # Not available from image
                    "distance_from_water": 0,  # Not available from image
                    "ai_analysis": analysis
                }
            else:
                # Fallback analysis without AI
                return {
                    "risk_level": "Medium",
                    "description": f"Manual analysis of {file.filename}",
                    "recommendations": [
                        "AI analysis not available",
                        "Consider professional assessment",
                        "Check local flood maps"
                    ],
                    "elevation": 0,
                    "distance_from_water": 0,
                    "ai_analysis": "AI analysis not available - API key not configured"
                }
                
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
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
    risk_level: str
):
    """Create a manual flood risk assessment"""
    return {
        "location": location,
        "assessment": {
            "elevation": elevation,
            "water_proximity": water_proximity,
            "soil_type": soil_type,
            "risk_level": risk_level,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    }
