import { Globe } from "lucide-react"

const Header = () => {
  return (
    <div className="text-center mb-6 sm:mb-8 px-2">
    <div className="flex items-center justify-center mb-3 sm:mb-4">
      <div className="p-2 sm:p-3 bg-blue-100 rounded-full mr-3 sm:mr-4">
        <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
      </div>
      <h1 className="text-xl sm:text-3xl font-bold text-slate-900">
        Flood Detection System
      </h1>
    </div>
    <p className="text-sm sm:text-base text-slate-600">
      Analyze flood risk using coordinates or upload images for AI-powered
      terrain analysis
    </p>
  </div>

  )
}

export default Header