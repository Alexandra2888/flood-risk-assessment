import { Globe, Map as MapIcon } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { RefObject } from "react"

interface MapProps {
  mapError: boolean;
  mapRef: RefObject<HTMLDivElement | null>;
}

const Map = ({ mapError, mapRef }: MapProps) => {
  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-green-600" />
          Interactive Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mapError ? (
          <div className="w-full h-80 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
            <MapIcon className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Map Not Available
            </h3>
            <p className="text-slate-500 text-center max-w-md">
              To enable the interactive map, set up a Google Maps API key in
              .env.local
            </p>
          </div>
        ) : (
          <div
            ref={mapRef}
            className="w-full h-80 rounded-lg border border-slate-200"
          />
        )}
      </CardContent>
    </Card>
  )
}

export default Map