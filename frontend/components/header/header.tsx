import { Globe } from "lucide-react"

const Header = () => {
  return (
    <div className="text-center mb-8">
    <div className="flex items-center justify-center mb-4">
      <div className="p-3 bg-blue-100 rounded-full mr-4">
        <Globe className="h-8 w-8 text-blue-600" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900">
        Flood Detection System
      </h1>
    </div>
    <p className="text-slate-600">
      Analyze flood risk using coordinates or upload images for AI-powered
      terrain analysis
    </p>
    
  </div>

  )
}

export default Header