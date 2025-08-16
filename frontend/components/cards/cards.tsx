import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { AlertTriangle, CheckCircle, Info, Shield, TrendingUp, MapPin, Droplets } from "lucide-react";
import { FloodRiskData } from "@/lib/types";

interface CardsProps {
  floodRisk: FloodRiskData | null;
  isLoading: boolean;
}

const Cards = ({ floodRisk, isLoading }: CardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-slate-200 rounded mb-3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!floodRisk) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm border-dashed border-slate-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-slate-500">
              <Shield className="h-5 w-5" />
              No Data Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">Run an analysis to see flood risk information</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case "Very High":
      case "High":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "Medium":
        return <Info className="h-5 w-5 text-yellow-500" />;
      case "Low":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Shield className="h-5 w-5 text-slate-500" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "Very High":
        return "bg-red-100 text-red-800 border-red-200";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Risk Level Card */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-700">
            {getRiskIcon(floodRisk.riskLevel)}
            Risk Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={`${getRiskColor(floodRisk.riskLevel)} text-sm font-semibold`}>
            {floodRisk.riskLevel}
          </Badge>
          <p className="text-slate-600 text-sm mt-2">{floodRisk.description}</p>
        </CardContent>
      </Card>

      {/* Elevation Card */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Elevation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {floodRisk.elevation}m
          </div>
          <p className="text-slate-500 text-xs">Above sea level</p>
        </CardContent>
      </Card>

      {/* Distance from Water Card */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <Droplets className="h-5 w-5 text-blue-600" />
            From Water
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {floodRisk.distanceFromWater}m
          </div>
          <p className="text-slate-500 text-xs">Distance to nearest water body</p>
        </CardContent>
      </Card>

      {/* Recommendations Card */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <MapPin className="h-5 w-5 text-green-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {floodRisk.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-slate-700">{rec}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cards;