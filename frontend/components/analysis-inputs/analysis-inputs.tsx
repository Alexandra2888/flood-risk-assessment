import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Loader2,
  Image as LucideImage,
  Camera,
  Upload,
  Shield,
} from "lucide-react";
import { AnalysisInputsProps, FloodRiskData } from "@/lib/types";
import { useAuthenticatedUser } from "@/lib/auth-utils";

const AnalysisInputs = ({
  onAnalysisComplete,
  isLoading,
  setIsLoading,
  setAlertMessage,
  setAlertType,
  setShowAlert,
  onMapUpdate,
}: AnalysisInputsProps) => {
  const [inputLat, setInputLat] = useState("");
  const [inputLng, setInputLng] = useState("");
  const [analysisType, setAnalysisType] = useState<"coordinates" | "image">(
    "coordinates"
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get authentication token
  const { authToken, isAuthenticated, isLoading: authLoading, localUser, error: authError} = useAuthenticatedUser();

  const API_BASE_URL = "http://localhost:8000/api/v1";

  // Debug logging
  console.log('Auth Debug:', {
    isAuthenticated,
    authToken: authToken ? `${authToken.substring(0, 10)}...` : null,
    localUser: localUser ? { id: localUser.id, email: localUser.email } : null,
    authError,
    authLoading
  });

  // API calls
  const callAPI = async (endpoint: string, data: FormData | Record<string, unknown>) => {
    // Check if user is authenticated and has a token
    if (!isAuthenticated || !authToken) {
      throw new Error("Authentication required. Please sign in to continue.");
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Making API call to: ${url}`);
    console.log('Request data:', data);
    
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${authToken}`,
      };

      // Add Content-Type header for JSON requests
      if (endpoint.includes("coordinates")) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: endpoint.includes("coordinates") ? JSON.stringify(data as Record<string, unknown>) : data as FormData,
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      return result;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  // Analysis handlers
  const handleCoordinateSubmit = async () => {
    // Trim whitespace and validate input
    const trimmedLat = inputLat.trim();
    const trimmedLng = inputLng.trim();
    
    if (!trimmedLat || !trimmedLng) {
      setAlertMessage("Please enter both latitude and longitude");
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    // Check for common input errors
    if (trimmedLat.includes(',') || trimmedLng.includes(',')) {
      setAlertMessage("Please enter coordinates as separate numbers, not as a comma-separated pair");
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    const lat = parseFloat(trimmedLat);
    const lng = parseFloat(trimmedLng);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setAlertMessage(
        `Please enter valid coordinates:
        • Latitude: -90 to 90 (e.g., 40.7128)
        • Longitude: -180 to 180 (e.g., -74.0060)
        
        Your input: Lat: ${trimmedLat}, Lng: ${trimmedLng}`
      );
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    setIsLoading(true);
    try {
      const apiResponse = await callAPI("/analyze/coordinates", {
        latitude: lat,
        longitude: lng,
      });
      
      // Map backend response to frontend interface
      const riskData: FloodRiskData = {
        riskLevel: apiResponse.risk_level || "Medium",
        description: apiResponse.description || "No description available",
        recommendations: apiResponse.recommendations || [],
        elevation: apiResponse.elevation || 0,
        distanceFromWater: apiResponse.distance_from_water || 0,
      };
      
      const aiAnalysis = apiResponse.ai_analysis || "";
      
      onAnalysisComplete(riskData, aiAnalysis);

      // Show success message
      setAlertMessage(`Successfully analyzed coordinates (${lat}, ${lng}). Risk level: ${riskData.riskLevel}`);
      setAlertType("success");
      setShowAlert(true);

      // Update map if callback provided
      if (onMapUpdate) {
        onMapUpdate(lat, lng, riskData);
      }
    } catch (error) {
      console.error("Error analyzing coordinates:", error);
      
      // Handle authentication errors specifically
      if (error instanceof Error && error.message.includes("Authentication required")) {
        setAlertMessage("Please sign in to analyze coordinates");
        setAlertType("error");
      } else {
        setAlertMessage(
          "Error analyzing coordinates. Please check if the backend server is running."
        );
        setAlertType("error");
      }
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024 || !file.type.startsWith("image/")) {
        setAlertMessage(
          file.size > 10 * 1024 * 1024
            ? "Image size must be less than 10MB"
            : "Please select a valid image file"
        );
        setAlertType("error");
        setShowAlert(true);
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageAnalysis = async () => {
    if (!selectedImage) {
      setAlertMessage("Please select an image first");
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedImage);
      const apiResponse = await callAPI("/analyze/image", formData);
      
      // Map backend response to frontend interface
      const riskData: FloodRiskData = {
        riskLevel: apiResponse.risk_level || "Medium",
        description: apiResponse.description || "No description available",
        recommendations: apiResponse.recommendations || [],
        elevation: apiResponse.elevation || 0,
        distanceFromWater: apiResponse.distance_from_water || 0,
      };
      
      const aiAnalysis = apiResponse.ai_analysis || "";
      
      onAnalysisComplete(riskData, aiAnalysis);
    } catch (error) {
      console.error("Error analyzing image:", error);
      
      // Handle authentication errors specifically
      if (error instanceof Error && error.message.includes("Authentication required")) {
        setAlertMessage("Please sign in to analyze images");
        setAlertType("error");
      } else {
        setAlertMessage(
          "Error analyzing image. Please check if the backend server is running."
        );
        setAlertType("error");
      }
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Analysis Methods
            </CardTitle>
           
          </CardHeader>
          <CardContent>
            {/* Authentication Required Message */}
            {!isAuthenticated && !authLoading && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  🔐 <strong>Authentication Required:</strong> You need to be signed in to use the flood risk analysis features. 
                  Please sign in using the authentication system above.
                </p>
              </div>
            )}
            
         
            
            <Tabs
              value={analysisType}
              onValueChange={(value) =>
                setAnalysisType(value as "coordinates" | "image")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="coordinates"
                  className="flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Coordinates
                </TabsTrigger>
                <TabsTrigger
                  value="image"
                  className="flex items-center gap-2"
                >
                  <LucideImage className="h-4 w-4" />
                  Image Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="coordinates" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      placeholder="40.7128"
                      value={inputLat}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers, decimal points, and minus signs
                        if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                          setInputLat(value);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= -90 && value <= 90) {
                          setInputLat(e.target.value);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      placeholder="-74.0060"
                      value={inputLng}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers, decimal points, and minus signs
                        if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                          setInputLng(value);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= -180 && value <= 180) {
                          setInputLng(e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Help text */}
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                  <p className="mb-1"><strong>Coordinate Format:</strong></p>
                  <p>• Latitude: -90° to 90° (positive = North, negative = South)</p>
                  <p>• Longitude: -180° to 180° (positive = East, negative = West)</p>
                  <p className="mt-1"><strong>Example:</strong> New York City: 40.7128, -74.0060</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleCoordinateSubmit}
                    disabled={isLoading || !isAuthenticated || !authToken}
                    className="flex-1"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Analyze Coordinates
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setInputLat("");
                      setInputLng("");
                    }}
                    variant="outline"
                    size="lg"
                    disabled={isLoading}
                  >
                    Clear
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="image" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {!imagePreview ? (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 mx-auto text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            Upload terrain image
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            JPG, PNG, or GIF up to 10MB
                          </p>
                        </div>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          size="sm"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Choose Image
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Image
                          src={imagePreview}
                          alt="Terrain image preview"
                          width={200}
                          height={150}
                          className="max-h-48 mx-auto rounded-lg shadow-sm"
                        />
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            size="sm"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Change Image
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedImage(null);
                              setImagePreview("");
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleImageAnalysis}
                    disabled={isLoading || !selectedImage || !isAuthenticated || !authToken}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <LucideImage className="mr-2 h-4 w-4" />
                        Analyze Image
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      
  );
};

export default AnalysisInputs;
