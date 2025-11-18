/**
 * Feature: Location Selection Canvas (Simplified)
 * Purpose: Display location targeting interface with map
 * References:
 *  - React: https://react.dev/reference/react/useEffect
 */
"use client"

import { useEffect } from "react"
import { Plus, X, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLocation } from "@/lib/context/location-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { LocationMap } from "@/components/location-map"

interface LocationData {
  id: string
  name: string
  type: string
  mode?: string
  radius?: number
  coordinates: [number, number]
  bbox?: [number, number, number, number]
  geometry?: {
    type: string
    coordinates: number[] | number[][] | number[][][] | number[][][][]
  }
  [key: string]: unknown
}

interface LocationSelectionCanvasProps {
  variant?: "step" | "summary"
}

export function LocationSelectionCanvas({ variant = "step" }: LocationSelectionCanvasProps = {}) {
  const { locationState, removeLocation, resetLocations, clearLocations, startLocationSetup, addLocations } = useLocation()
  const { isPublished } = useAdPreview()
  const isSummary = variant === "summary"

  const handleAddMore = () => {
    try {
      // Validate via context (will throw if no ad)
      startLocationSetup()
      
      // Dispatch request event for AI chat to handle
      window.dispatchEvent(new Event('requestLocationSetup'))
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Please select an ad first')
    }
  }

  // Listen for location updates from AI chat (matching PreviewPanel pattern)
  useEffect(() => {
    const handleLocationUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ 
        sessionId?: string;
        locations: Array<{
          name: string;
          coordinates: [number, number];
          radius?: number;
          type: string;
          mode: string;
          bbox?: [number, number, number, number];
          geometry?: unknown;
          key?: string;
          country_code?: string;
        }>;
        mode: string;
      }>;
      const { sessionId, locations } = customEvent.detail;
      
      if (!sessionId || !locations) return;
      
      console.log('[LocationCanvas] Received locationUpdated event', {
        count: locations.length,
        names: locations.map(l => l.name)
      });
      
      // Update context (triggers autosave)
      addLocations(locations, true);
    };
    
    window.addEventListener('locationUpdated', handleLocationUpdated);
    
    return () => {
      window.removeEventListener('locationUpdated', handleLocationUpdated);
    };
  }, [addLocations]);

  // Initial state - no locations selected
  if (locationState.status === "idle" || locationState.locations.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col",
          isSummary ? "gap-6" : "h-full overflow-auto p-8"
        )}
      >
        <div className={cn("w-full space-y-6", "max-w-3xl mx-auto")}>
          {/* Empty Map Display */}
          <LocationMap locations={[]} />

          {/* Add Location Button */}
          {!isSummary && (
            <div className="flex justify-center pt-4 pb-8">
              <Button
                variant="outline"
                size="lg"
                onClick={handleAddMore}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (locationState.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setup Failed</h2>
            <p className="text-muted-foreground">
              {locationState.errorMessage || "Couldn't set up locations. Try again or ask AI for help."}
            </p>
          </div>
          
          <Button
            size="lg"
            onClick={resetLocations}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Show map and location cards whenever we have locations
  const includedLocations = locationState.locations.filter(loc => loc.mode === "include")
  const excludedLocations = locationState.locations.filter(loc => loc.mode === "exclude")

  return (
    <div
      className={cn(
        "flex flex-col",
        isSummary ? "gap-6" : "h-full overflow-auto p-8"
      )}
    >
      <div className={cn("w-full space-y-6", "max-w-3xl mx-auto")}>
        {/* Published Warning Banner */}
        {isPublished && !isSummary && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-left text-sm space-y-1">
                <p className="font-medium text-orange-700 dark:text-orange-400">Live Campaign - Edit with Caution</p>
                <p className="text-orange-600 dark:text-orange-300 text-xs">
                  This ad is currently published. Changes to location targeting will update your live campaign.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Simple Map Display */}
        <LocationMap locations={locationState.locations} />

        {/* Location Summary Cards */}
        <div className="flex flex-col gap-4">
          {/* Included Locations */}
          {includedLocations.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-semibold">Included</h3>
                <Badge className="badge-muted">{includedLocations.length}</Badge>
              </div>
              <div className="space-y-2">
                {includedLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location as LocationData}
                    onRemove={isSummary ? undefined : removeLocation}
                    readonly={isSummary}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Excluded Locations */}
          {excludedLocations.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base font-semibold">Excluded</h3>
                <Badge className="badge-muted">{excludedLocations.length}</Badge>
              </div>
              <div className="space-y-2">
                {excludedLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location as LocationData}
                    onRemove={isSummary ? undefined : removeLocation}
                    isExcluded
                    readonly={isSummary}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isSummary && (
          <div className="flex justify-center gap-4 pt-4 pb-8">
            <Button
              variant="outline"
              size="lg"
              onClick={handleAddMore}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
            {locationState.locations.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={clearLocations}
              >
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Location Card Component
function LocationCard({
  location,
  onRemove,
  isExcluded = false,
  readonly = false,
}: {
  location: LocationData
  onRemove?: (id: string) => void
  isExcluded?: boolean
  readonly?: boolean
}) {
  const getLocationTypeLabel = () => {
    switch (location.type) {
      case "radius": return location.radius ? `${location.radius} mile radius` : "Radius"
      case "city": return "City"
      case "region": return "Province/Region"
      case "country": return "Country"
      default: return location.type
    }
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="icon-tile-muted">
          {isExcluded ? (
            <X className="h-4 w-4 text-red-600" />
          ) : (
            <Check className="h-4 w-4 text-status-green" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-medium truncate">{location.name}</p>
            {isExcluded && <span className="status-muted flex-shrink-0">Excluded</span>}
          </div>
          <p className="text-xs text-muted-foreground">{getLocationTypeLabel()}</p>
        </div>
      </div>
      {!readonly && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(location.id)}
          className="h-6 w-6 hover:bg-red-500/10 hover:text-red-600 flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
