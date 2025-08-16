"use client";

import { useState, useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import Header from "@/components/header/header";
import Results from "@/components/results/results";
import Map from "@/components/map/map";
import AnalysisInputs from "@/components/analysis-inputs/analysis-inputs";
import Cards from "@/components/cards/cards";
import Dialog from "@/components/dialog/dialog";
import { FloodRiskData } from "@/lib/types";

export default function FloodDetectionSystem() {
  const [floodRisk, setFloodRisk] = useState<FloodRiskData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "info" | "warning">("info");
  const [mapError, setMapError] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
        setMapError(true);
        return;
      }

      try {
        const google = await new Loader({
          apiKey,
          version: "weekly",
          libraries: ["places"],
        }).load();
        if (mapRef.current) {
          setMap(
            new google.maps.Map(mapRef.current, {
              center: { lat: 40.7128, lng: -74.006 },
              zoom: 10,
              mapTypeId: google.maps.MapTypeId.TERRAIN,
            })
          );
        }
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        setMapError(true);
      }
    };
    initMap();
  }, []);

  // Handler for when analysis is complete
  const handleAnalysisComplete = (riskData: FloodRiskData, aiAnalysisText: string) => {
    setFloodRisk(riskData);
    setAiAnalysis(aiAnalysisText);
  };

  // Handler for map updates
  const handleMapUpdate = (lat: number, lng: number, riskData: FloodRiskData) => {
    if (map) {
      map.setCenter({ lat, lng });
      map.setZoom(15);
      map.data.forEach((feature) => map.data.remove(feature));
      new google.maps.Marker({
        position: { lat, lng },
        map,
        title: "Selected Location",
      });
      const riskColor =
        riskData.riskLevel === "Very High"
          ? "#FF0000"
          : riskData.riskLevel === "High"
          ? "#FF6600"
          : riskData.riskLevel === "Medium"
          ? "#FFCC00"
          : "#00FF00";
      new google.maps.Circle({
        strokeColor: riskColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: riskColor,
        fillOpacity: 0.35,
        map,
        center: { lat, lng },
        radius: 1000,
      });
    }
  };

  // Helper function to get alert title
  const getAlertTitle = (type: string) => {
    switch (type) {
      case "success":
        return "Success";
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      case "info":
        return "Information";
      default:
        return "Information";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Input Section */}
          <AnalysisInputs
            onAnalysisComplete={handleAnalysisComplete}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setAlertMessage={setAlertMessage}
            setAlertType={setAlertType}
            setShowAlert={setShowAlert}
            onMapUpdate={handleMapUpdate}
          />

          {/* Results Section */}
          <Results 
            floodRisk={floodRisk}
            isLoading={isLoading}
            analysisType="coordinates"
            aiAnalysis={aiAnalysis}
          />
        </div>

        {/* Cards Section - Alternative view of results */}
        {floodRisk && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">
              Risk Assessment Overview
            </h2>
            <Cards floodRisk={floodRisk} isLoading={isLoading} />
          </div>
        )}

        {/* Map Section */}
        <Map 
          map={map}
          mapError={mapError}
          mapRef={mapRef}
          floodRisk={floodRisk}
        />
      </div>

      {/* Custom Alert Dialog */}
      <Dialog
        open={showAlert}
        onOpenChange={setShowAlert}
        title={getAlertTitle(alertType)}
        message={alertMessage}
        type={alertType}
      />
    </div>
  );
}