"use client"

import { MapPin, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface LocationConfirmationCardProps {
  locations: Array<{
    name: string
    type: string
    mode: 'include' | 'exclude'
    radius?: number
  }>
  explanation?: string
  onConfirm: () => void
  onCancel: () => void
}

export function LocationConfirmationCard({
  locations,
  explanation,
  onConfirm,
  onCancel
}: LocationConfirmationCardProps) {
  return (
    <div className="border rounded-lg bg-card p-4 space-y-4 my-3">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
          <MapPin className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-sm">Set Location Targeting?</h3>
          {explanation && (
            <p className="text-sm text-muted-foreground">{explanation}</p>
          )}
          
          <div className="space-y-2 pt-2">
            {locations.map((loc, idx) => {
              const isExcluded = loc.mode === 'exclude'
              const typeLabel = loc.type === 'radius' && loc.radius 
                ? `${loc.radius} mile radius` 
                : loc.type === 'city' ? 'City'
                : loc.type === 'region' ? 'Province/Region'
                : loc.type === 'country' ? 'Country'
                : loc.type
              
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-md border ${
                    isExcluded 
                      ? 'bg-red-500/5 border-red-500/20' 
                      : 'bg-green-500/5 border-green-500/20'
                  }`}
                >
                  {isExcluded ? (
                    <X className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel}</p>
                  </div>
                  {isExcluded && (
                    <Badge variant="destructive" className="text-[10px] h-5">Excluded</Badge>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button onClick={onConfirm} size="sm" className="flex-1">
              Confirm
            </Button>
            <Button onClick={onCancel} variant="outline" size="sm" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

