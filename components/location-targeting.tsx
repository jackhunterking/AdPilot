"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, X, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

interface LeafletLib {
  map(element: HTMLElement, options?: unknown): LeafletMap;
  tileLayer(url: string, options?: unknown): { addTo(map: LeafletMap): void };
  marker(coords: [number, number], options?: unknown): LeafletMarker;
  circle(coords: [number, number], options?: unknown): LeafletShape;
  circleMarker(coords: [number, number], options?: unknown): LeafletMarker;
  geoJSON(data: unknown, options?: unknown): LeafletShape;
  latLngBounds(): LeafletBounds;
  rectangle(bounds: [[number, number], [number, number]], options?: unknown): LeafletShape;
  [key: string]: unknown;
}

// Helper function to safely access Leaflet library
function getLeaflet(): LeafletLib | null {
  if (typeof window === "undefined") return null
  return (window as unknown as { L?: LeafletLib }).L ?? null
}

interface Location {
  id: string
  name: string
  coordinates: [number, number]
  radius?: number
  type: "radius" | "city" | "region" | "country"
  mode: "include" | "exclude"
  bbox?: [number, number, number, number]
  geometry?: GeoJSONGeometry
}

interface LocationTargetingProps {
  externalLocations?: Location[]
}

export function LocationTargeting({ externalLocations }: LocationTargetingProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const mapRef = useRef<LeafletMap | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<LeafletMarker[]>([])
  const shapesRef = useRef<LeafletShape[]>([])
  const isMapInitializedRef = useRef(false)

  // Update locations from external source (AI chat)
  useEffect(() => {
    if (externalLocations) {
      setLocations(externalLocations)
    }
  }, [externalLocations])

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || isMapInitializedRef.current) return
    const L = getLeaflet()
    if (!L) return

    console.log("[OpenStreetMap] Initializing map...")

    try {
      // Create map with world view as placeholder
      mapRef.current = L.map(mapContainerRef.current, {
        center: [20, 0], // Center on world map
        zoom: 2, // World view zoom level
        zoomControl: true,
        minZoom: 1,
        maxZoom: 19,
      })

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)

      isMapInitializedRef.current = true
      console.log("[OpenStreetMap] Map initialized with world view")
      } catch (error) {
      console.error("[OpenStreetMap] Error initializing map:", error)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        isMapInitializedRef.current = false
      }
    }
  }, [])

  // Update map when locations change
  useEffect(() => {
    const L = getLeaflet()
    if (!mapRef.current || !L) return

    console.log("[OpenStreetMap] Updating map with", locations.length, "locations")

    // Clear existing markers and shapes
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    shapesRef.current.forEach(shape => shape.remove())
    shapesRef.current = []

    // If no locations, just reset to world view and return
    if (locations.length === 0) {
      mapRef.current.setView([20, 0], 2)
      return
    }

     // Add markers and shapes for each location
    locations.forEach((location) => {
      const color = location.mode === "include" ? "#16A34A" : "#DC2626"

      // Add marker
      if (!mapRef.current) return;
      
      const marker = L.circleMarker(
        [location.coordinates[1], location.coordinates[0]], // Leaflet uses [lat, lng]
        {
          radius: 8,
          fillColor: color,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }
      ).addTo(mapRef.current) as LeafletMarker & { bindPopup: (content: string) => void }

      marker.bindPopup(`<strong>${location.name}</strong>`)
      markersRef.current.push(marker)

      // Add circle for radius type
      if (location.type === "radius" && location.radius && mapRef.current) {
        const radiusInMeters = location.radius * 1609.34 // miles to meters
        const circle = L.circle(
          [location.coordinates[1], location.coordinates[0]],
          {
            radius: radiusInMeters,
            fillColor: color,
            fillOpacity: 0.15,
            color: color,
            weight: 2,
            opacity: 0.6,
          }
        ).addTo(mapRef.current)

        shapesRef.current.push(circle)
      }
      // Add boundary for city/region/country
      else if (location.geometry && (location.type === "city" || location.type === "region" || location.type === "country") && mapRef.current) {
        try {
          const geoJsonLayer = L.geoJSON(location.geometry, {
            style: {
              fillColor: color,
              fillOpacity: 0.25,
              color: color,
              weight: 3,
              opacity: 0.9,
            }
          }).addTo(mapRef.current)

          shapesRef.current.push(geoJsonLayer)
          console.log(`[OpenStreetMap] Added boundary for ${location.name}`)
        } catch (error) {
          console.error(`[OpenStreetMap] Error adding boundary for ${location.name}:`, error)
          // Fallback to bbox if geometry fails
          if (location.bbox) {
            addBboxRectangle(location, color)
          }
        }
      }
      // Fallback to bounding box rectangle
      else if (location.bbox) {
        addBboxRectangle(location, color)
      }
    })

    // Fit map to show all locations
    const bounds = L.latLngBounds() as LeafletBounds & { extend: (coords: [number, number]) => void }
    
    locations.forEach(loc => {
      if (loc.bbox) {
        // Extend bounds to include the entire bounding box
        bounds.extend([loc.bbox[1], loc.bbox[0]]) // SW corner [lat, lng]
        bounds.extend([loc.bbox[3], loc.bbox[2]]) // NE corner [lat, lng]
      } else {
        bounds.extend([loc.coordinates[1], loc.coordinates[0]])
      }
    })
    
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
    }
  }, [locations])

  const addBboxRectangle = (location: Location, color: string) => {
    const L = getLeaflet()
    if (!location.bbox || !L || !mapRef.current) return

    const [minLng, minLat, maxLng, maxLat] = location.bbox

    const rectangle = L.rectangle(
      [[minLat, minLng], [maxLat, maxLng]], // Leaflet uses [lat, lng]
      {
        fillColor: color,
        fillOpacity: 0.2,
        color: color,
        weight: 3,
        opacity: 0.8,
      }
    ).addTo(mapRef.current)

    shapesRef.current.push(rectangle)
  }

  const handleRemoveLocation = (id: string) => {
    const updatedLocations = locations.filter((loc) => loc.id !== id)
    setLocations(updatedLocations)
    
    // Emit event to update dashboard state as well
    window.dispatchEvent(new CustomEvent('locationRemoved', { 
      detail: { id, updatedLocations } 
    }))
  }

  const includedLocations = locations.filter(loc => loc.mode === "include")
  const excludedLocations = locations.filter(loc => loc.mode === "exclude")

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Target className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold">Target Location</h3>
        </div>

        {/* Map Display */}
        <div className="rounded-lg overflow-hidden border border-border panel-surface mb-4 relative">
          <div ref={mapContainerRef} className="w-full h-[300px] z-0" />
          {locations.length === 0 && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
              <div className="text-center p-6">
                <div className="relative inline-block mb-3">
                  <Target className="h-10 w-10 text-blue-600" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-[2px] bg-red-600 rotate-45 rounded-full" />
              </div>
              </div>
                <p className="text-base text-white font-semibold">
                  No locations targeted yet
                </p>
                <p className="text-sm text-white/90 mt-2 italic">
                  Ask AI: &quot;Target Toronto&quot; or &quot;Show ads in California&quot;
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Included Locations */}
      {includedLocations.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">Included Locations</h3>
              <Badge className="badge-muted text-xs">{includedLocations.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Ads will show here</p>
          </div>
          <div className="space-y-2">
            {includedLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onRemove={handleRemoveLocation}
              />
            ))}
                  </div>
                </div>
              )}

      {/* Excluded Locations */}
      {excludedLocations.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">Excluded Locations</h3>
              <Badge variant="destructive" className="text-xs">{excludedLocations.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Ads will NOT show here</p>
          </div>
          <div className="space-y-2">
            {excludedLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onRemove={handleRemoveLocation}
                isExcluded
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Location Card Component
function LocationCard({ 
  location, 
  onRemove,
  isExcluded = false 
}: { 
  location: Location
  onRemove: (id: string) => void
  isExcluded?: boolean
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

  const getLocationIcon = () => {
    return <MapPin className="h-4 w-4" />
  }

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        isExcluded 
          ? "bg-red-500/5 border-red-500/30 hover:border-red-500/50" 
          : "panel-surface hover:border-blue-500/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isExcluded ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
        }`}>
          {getLocationIcon()}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">{location.name}</p>
            {isExcluded && (
              <span className="text-xs text-red-600 font-medium flex-shrink-0">
                Excluded
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{getLocationTypeLabel()}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(location.id)}
        className="h-7 w-7 text-muted-foreground hover:text-foreground hover-surface"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
