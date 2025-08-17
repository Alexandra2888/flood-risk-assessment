from pydantic import BaseModel, Field
from typing import Optional, List, TypeVar, Generic
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    """Enum for flood risk levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class WaterProximity(str, Enum):
    """Enum for water proximity levels"""
    VERY_CLOSE = "very_close"
    CLOSE = "close"
    MODERATE = "moderate"
    FAR = "far"
    VERY_FAR = "very_far"

class ManualAssessmentRequest(BaseModel):
    """Request model for manual flood risk assessment"""
    location: str = Field(..., description="Location name or coordinates")
    elevation: float = Field(..., description="Elevation in meters above sea level")
    water_proximity: WaterProximity = Field(..., description="Proximity to water bodies")
    soil_type: str = Field(..., description="Type of soil")
    risk_level: RiskLevel = Field(..., description="Assessed risk level")
    additional_notes: Optional[str] = Field(None, description="Additional notes or observations")

class ManualAssessmentResponse(BaseModel):
    """Response model for manual flood risk assessment"""
    id: str = Field(..., description="Unique assessment ID")
    location: str = Field(..., description="Location name or coordinates")
    assessment: dict = Field(..., description="Assessment details")
    timestamp: datetime = Field(..., description="Assessment timestamp")
    created_by: Optional[str] = Field(None, description="User who created the assessment")

class ImageAnalysisRequest(BaseModel):
    """Request model for image analysis"""
    location: Optional[str] = Field(None, description="Location context for analysis")
    analysis_type: str = Field(default="flood_risk", description="Type of analysis to perform")

class ImageAnalysisResponse(BaseModel):
    """Response model for image analysis"""
    filename: str = Field(..., description="Name of the analyzed file")
    location: Optional[str] = Field(None, description="Location context provided")
    analysis: str = Field(..., description="AI analysis results")
    risk_assessment: str = Field(..., description="Risk assessment summary")
    confidence_score: Optional[float] = Field(None, description="AI confidence score")
    processing_time: Optional[float] = Field(None, description="Processing time in seconds")

class RiskFactorsResponse(BaseModel):
    """Response model for risk factors"""
    risk_factors: List[str] = Field(..., description="List of common flood risk factors")
    count: int = Field(..., description="Number of risk factors")

class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    timestamp: datetime = Field(..., description="Health check timestamp")
    version: str = Field(..., description="API version")

class ErrorResponse(BaseModel):
    """Response model for errors"""
    detail: str = Field(..., description="Error description")
    error_code: Optional[str] = Field(None, description="Error code")
    timestamp: datetime = Field(..., description="Error timestamp")

# User-related models
class User(BaseModel):
    """User model"""
    id: str = Field(..., description="User ID")
    clerkId: str = Field(..., description="Clerk user ID")
    email: str = Field(..., description="User email")
    firstName: Optional[str] = Field(None, description="User first name")
    lastName: Optional[str] = Field(None, description="User last name")
    imageUrl: Optional[str] = Field(None, description="User profile image URL")
    createdAt: str = Field(..., description="User creation timestamp")
    updatedAt: str = Field(..., description="User last update timestamp")
    lastSignInAt: Optional[str] = Field(None, description="Last sign in timestamp")

class UserToken(BaseModel):
    """User token model"""
    id: str = Field(..., description="Token ID")
    userId: str = Field(..., description="User ID")
    clerkId: str = Field(..., description="Clerk user ID")
    token: str = Field(..., description="Authentication token")
    expiresAt: str = Field(..., description="Token expiration timestamp")
    createdAt: str = Field(..., description="Token creation timestamp")

class TokenVerificationRequest(BaseModel):
    """Request model for token verification"""
    token: str = Field(..., description="Token to verify")

class TokenVerificationResponse(BaseModel):
    """Response model for token verification"""
    valid: bool = Field(..., description="Whether the token is valid")
    user: Optional[User] = Field(None, description="User associated with the token")
    error: Optional[str] = Field(None, description="Error message if verification failed")

# Generic API Response models
T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    """Generic API response model"""
    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[T] = Field(None, description="Response data")
    error: Optional[str] = Field(None, description="Error message")
    message: Optional[str] = Field(None, description="Response message")
