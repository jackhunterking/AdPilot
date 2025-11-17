"use client"

import { Loader2, MapPin } from "lucide-react"

interface LocationProcessingCardProps {
  locationCount: number
}

export function LocationProcessingCard({ locationCount }: LocationProcessingCardProps) {
  return (
    <div className="border rounded-lg bg-blue-500/5 border-blue-500/20 p-4 my-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
          <MapPin className="h-4 w-4 text-blue-600 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-sm font-medium">
              Finding {locationCount} {locationCount === 1 ? 'location' : 'locations'}...
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Geocoding coordinates and fetching boundaries
          </p>
        </div>
      </div>
    </div>
  )
}

