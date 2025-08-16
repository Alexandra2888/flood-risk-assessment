import { Separator } from "@radix-ui/react-separator"
import { TrendingUp, Loader2, Shield, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { ResultsProps } from "@/lib/types"


const Results = ({ floodRisk, isLoading, analysisType, aiAnalysis }: ResultsProps) => {
  // Helper functions
  const getRiskVariant = (riskLevel: string) =>
    riskLevel === "Very High" || riskLevel === "High"
      ? "destructive"
      : riskLevel === "Medium"
      ? "secondary"
      : "default";

  const getRiskIcon = (riskLevel: string) =>
    riskLevel === "Very High" || riskLevel === "High" ? (
      <AlertTriangle className="h-4 w-4" />
    ) : riskLevel === "Medium" ? (
      <Info className="h-4 w-4" />
    ) : (
      <CheckCircle className="h-4 w-4" />
    );

  return (
    
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-600" />
        Risk Assessment
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-slate-600">
            {analysisType === "coordinates"
              ? "Analyzing coordinates..."
              : "Analyzing image..."}
          </p>
        </div>
      )}

      {floodRisk && !isLoading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getRiskIcon(floodRisk.riskLevel)}
              <span className="font-semibold">Risk Level</span>
            </div>
            <Badge
              variant={getRiskVariant(floodRisk.riskLevel)}
              className="text-sm"
            >
              {floodRisk.riskLevel}
            </Badge>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed">
            {floodRisk.description}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {floodRisk.elevation}m
              </div>
              <div className="text-xs text-slate-500">Elevation</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {floodRisk.distanceFromWater}m
              </div>
              <div className="text-xs text-slate-500">From Water</div>
            </div>
          </div>

          {aiAnalysis && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-slate-700 mb-3">
                  AI Analysis
                </h4>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {aiAnalysis}
                  </p>
                </div>
              </div>
            </>
          )}

          <div>
            <h4 className="font-medium text-slate-700 mb-3">
              Recommendations
            </h4>
            <ul className="space-y-2">
              {floodRisk.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-slate-600"
                >
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!floodRisk && !isLoading && (
        <div className="text-center py-12 text-slate-500">
          <Shield className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p>Choose an analysis method to see flood risk assessment</p>
        </div>
      )}
    </CardContent>
  </Card>
 
  );
}

export default Results