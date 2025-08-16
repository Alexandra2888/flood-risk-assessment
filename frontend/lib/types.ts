export interface FloodRiskData {
  riskLevel: "Low" | "Medium" | "High" | "Very High";
  description: string;
  recommendations: string[];
  elevation: number;
  distanceFromWater: number;
}

export interface FloodRiskData {
  riskLevel: "Low" | "Medium" | "High" | "Very High";
  description: string;
  recommendations: string[];
  elevation: number;
  distanceFromWater: number;
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