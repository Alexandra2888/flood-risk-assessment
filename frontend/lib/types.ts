export interface FloodRiskData {
  riskLevel: "Low" | "Medium" | "High" | "Very High";
  description: string;
  recommendations: string[];
  elevation: number;
  distanceFromWater: number;
}

// User-related types
export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastSignInAt?: string;
}

export interface UserToken {
  id: string;
  userId: string;
  clerkId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuthenticatedUser {
  user: User;
  token: string;
  expiresAt: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SyncUserRequest {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  lastSignInAt?: string;
}

export interface GenerateTokenRequest {
  clerkId: string;
  expiresInMinutes?: number;
}

export interface ResultsProps {
  floodRisk: FloodRiskData | null;
  isLoading: boolean;
  analysisType: "coordinates" | "image";
  aiAnalysis: string;
}

export interface AnalysisInputsProps {
  onAnalysisComplete: (riskData: FloodRiskData, aiAnalysis: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setAlertMessage: (message: string) => void;
  setAlertType: (type: "error" | "success" | "info" | "warning") => void;
  setShowAlert: (show: boolean) => void;
  onMapUpdate?: (lat: number, lng: number, riskData: FloodRiskData) => void;
}