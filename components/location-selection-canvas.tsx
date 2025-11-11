"use client"

import { MapPin, Loader2, Lock, Plus, X, Sparkles, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLocation } from "@/lib/context/location-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface LeafletBounds {
  isValid(): boolean;
  [key: string]: unknown;
}

interface LeafletMap {
  remove(): void;
  invalidateSize(options?: unknown): void;
  fitBounds(bounds: LeafletBounds, options?: unknown): void;
  setView(coords: [number, number], zoom: number): void;
  [key: string]: unknown;
}

interface LeafletMarker {
  remove(): void;
  addTo(map: LeafletMap): LeafletMarker;
  [key: string]: unknown;
}

interface LeafletShape {
  remove(): void;
  addTo(map: LeafletMap): LeafletShape;
  [key: string]: unknown;
}

interface LocationData {
  id: string;
  name: string;
  type: string;
  mode?: string;
  radius?: number;
  coordinates: [number, number];
  bbox?: [number, number, number, number];
  geometry?: {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  [key: string]: unknown;
}

declare global {
  interface Window {
    L: {
      map(element: HTMLElement, options?: unknown): LeafletMap;
      tileLayer(url: string, options?: unknown): { addTo(map: LeafletMap): void };
      marker(coords: [number, number], options?: unknown): LeafletMarker;
      circle(coords: [number, number], options?: unknown): LeafletShape;
      circleMarker(coords: [number, number], options?: unknown): LeafletMarker;
      geoJSON(data: unknown, options?: unknown): LeafletShape;
      latLngBounds(): LeafletBounds;
      rectangle(bounds: [[number, number], [number, number]], options?: unknown): LeafletShape;
      [key: string]: unknown;
    };
  }
}

interface LocationSelectionCanvasProps {
  variant?: "step" | "summary"
}

export function LocationSelectionCanvas({ variant = "step" }: LocationSelectionCanvasProps = {}) {
  const { locationState, removeLocation, resetLocations, clearLocations } = useLocation()
  const { isPublished } = useAdPreview()
  const mapRef = useRef<LeafletMap | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<LeafletMarker[]>([])
  const shapesRef = useRef<LeafletShape[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const isSummary = variant === "summary"

  // Initialize map when container is ready
  useEffect(() => {
    // Initialize map for both idle and completed states
    const shouldInitialize = locationState.status === "idle" || locationState.status === "completed"
    
    if (!shouldInitialize) {
      // Clean up map if status changed away from idle/completed
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        setIsMapReady(false)
      }
      return
    }

    if (!mapContainerRef.current) return
    if (typeof window === "undefined" || !window.L) return
    if (isMapReady) return // Already initialized

    // Initialize map
    const initTimer = setTimeout(() => {
      try {
        // Clear any existing map first
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }

        if (!mapContainerRef.current) return

        mapRef.current = window.L.map(mapContainerRef.current, {
          center: [20, 0],
          zoom: 2,
          zoomControl: true,
          minZoom: 1,
          maxZoom: 19,
          scrollWheelZoom: true,
        })

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current)

        // Force immediate size calculation
        mapRef.current.invalidateSize(true)
        
        // Invalidate size again after render to ensure proper rendering
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize(true)
            setIsMapReady(true) // Trigger re-render to add markers
            console.log("[Map] Initialized successfully")
          }
        }, 150)
      } catch (error) {
        console.error("[OpenStreetMap] Error initializing map:", error)
      }
    }, 150)

    return () => clearTimeout(initTimer)
  }, [locationState.status, isMapReady])

  // Update map markers when locations change
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.L) {
      console.log("[Map] Not ready yet, waiting...")
      return
    }

    const map = mapRef.current // Store in local variable for TypeScript

    // Clear existing markers and shapes
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    shapesRef.current.forEach(shape => shape.remove())
    shapesRef.current = []

    const locations = locationState.locations
    console.log("[Map] Updating with locations:", locations.length)

    if (locations.length === 0) {
      map.setView([20, 0], 2)
      return
    }

    // Filter out any locations with invalid coordinates (safety check)
    const validLocations = locations.filter(loc => 
      loc.coordinates && 
      Array.isArray(loc.coordinates) && 
      loc.coordinates.length === 2 &&
      typeof loc.coordinates[0] === 'number' &&
      typeof loc.coordinates[1] === 'number' &&
      !isNaN(loc.coordinates[0]) &&
      !isNaN(loc.coordinates[1])
    );

    console.log("[Map] Valid locations after filtering:", validLocations.length)
    validLocations.forEach(loc => {
      console.log(`[Map] ${loc.name}: [${loc.coordinates[0]}, ${loc.coordinates[1]}] - ${loc.mode}`)
    })

    if (validLocations.length === 0) {
      map.setView([20, 0], 2)
      return
    }

    // Add markers and shapes for each location
    validLocations.forEach((location) => {
      const color = location.mode === "include" ? "#16A34A" : "#DC2626"

      // Add marker
      const marker = window.L.circleMarker(
        [location.coordinates[1], location.coordinates[0]],
        {
          radius: 8,
          fillColor: color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }
      ).addTo(map) as LeafletMarker & { bindPopup: (content: string) => void }

      marker.bindPopup(`<strong>${location.name}</strong>`)
      markersRef.current.push(marker)

      // Add radius circle or boundaries based on type
      if (location.type === "radius" && location.radius) {
        const radiusInMeters = location.radius * 1609.34
        const circle = window.L.circle(
          [location.coordinates[1], location.coordinates[0]],
          {
            radius: radiusInMeters,
            fillColor: color,
            fillOpacity: 0.15,
            color: color,
            weight: 2,
            opacity: 0.6,
          }
        ).addTo(map)
        shapesRef.current.push(circle)
      } else if (location.geometry) {
        try {
          const geoJsonLayer = window.L.geoJSON(location.geometry, {
            style: {
              fillColor: color,
              fillOpacity: 0.25,
              color: color,
              weight: 3,
              opacity: 0.9,
            }
          }).addTo(map)
          shapesRef.current.push(geoJsonLayer)
        } catch (error) {
          console.error("Error adding boundary:", error)
        }
      }
    })

    // Fit map to show all locations
    const bounds = window.L.latLngBounds() as LeafletBounds & { extend: (coords: [number, number]) => void }
    validLocations.forEach(loc => {
      if (loc.bbox) {
        bounds.extend([loc.bbox[1], loc.bbox[0]])
        bounds.extend([loc.bbox[3], loc.bbox[2]])
      } else {
        bounds.extend([loc.coordinates[1], loc.coordinates[0]])
      }
    })
    
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
      console.log("[Map] Fitted bounds successfully")
    }

    // Invalidate size to ensure proper rendering after adding markers
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize(true)
      }
    }, 100)
  }, [isMapReady, locationState.locations])

  const handleAddMore = () => {
    window.dispatchEvent(new CustomEvent('triggerLocationSetup'))
  }

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
          {/* Map Display */}
          <div className="rounded-lg border-2 border-blue-600 bg-card overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-[400px]" style={{ position: 'relative', isolation: 'isolate' }} />
          </div>

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

  // Setup in progress
  if (locationState.status === "setup-in-progress") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setting up locations...</h2>
            <p className="text-muted-foreground">
              AI is geocoding and mapping your locations. This may take a few seconds.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Setup completed - show locations with map
  if (locationState.status === "completed") {
    const includedLocations = locationState.locations.filter(loc => loc.mode === "include")
    const excludedLocations = locationState.locations.filter(loc => loc.mode === "exclude")

    return (
      <div
        className={cn(
          "flex flex-col",
          isSummary ? "gap-6" : "h-full overflow-auto p-8"
        )}
      >
        <div className={cn("w-full space-y-6", "max-w-3xl mx-auto")}
        >
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

          {/* Map Display */}
          <div className="rounded-lg border-2 border-blue-600 bg-card overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-[400px]" style={{ position: 'relative', isolation: 'isolate' }} />
          </div>

          {/* Location Summary */}
          <div className="flex flex-col gap-4">
            {/* Included Locations */}
            {includedLocations.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-semibold">Included</h3>
                  <Badge className="badge-muted">{includedLocations.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
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
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
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

  return null
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

