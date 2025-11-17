"use client"

import { CheckCircle2, MapPin, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LocationSuccessCardProps {
  locationCount: number
  onViewMap: () => void
}

export function LocationSuccessCard({ locationCount, onViewMap }: LocationSuccessCardProps) {
  return (
    <div className="border rounded-lg bg-green-500/5 border-green-500/20 p-4 my-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-green-600/10 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-600">
            Location targeting set!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {locationCount} {locationCount === 1 ? 'location' : 'locations'} configured
          </p>
        </div>
        <Button 
          onClick={onViewMap} 
          variant="outline" 
          size="sm"
          className="gap-2 flex-shrink-0"
        >
          <Eye className="h-3.5 w-3.5" />
          View Map
        </Button>
      </div>
    </div>
  )
}

