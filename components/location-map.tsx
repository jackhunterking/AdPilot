/**
 * Feature: Simple Location Map Component
 * Purpose: Render locations on OpenStreetMap with tile coverage
 * References:
 *  - Leaflet: https://leafletjs.com/reference.html
 */
"use client"

import { useRef, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLeafletReady } from '@/lib/hooks/use-leaflet-ready'

interface Location {
  id: string
  name: string
  coordinates: [number, number] // [lng, lat]
  mode: 'include' | 'exclude'
  type: string
  radius?: number
  bbox?: [number, number, number, number]
  geometry?: { type: string; coordinates: unknown }
}

interface LeafletMap {
  remove(): void
  fitBounds(bounds: unknown, options?: unknown): void
  removeLayer(layer: unknown): void
  eachLayer(fn: (layer: unknown) => void): void
  [key: string]: unknown
}

interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer
  bindPopup(content: string): LeafletLayer
  [key: string]: unknown
}

interface LeafletLib {
  map(element: HTMLElement, options?: unknown): LeafletMap
  tileLayer(url: string, options?: unknown): { addTo(map: LeafletMap): void }
  circleMarker(coords: [number, number], options?: unknown): LeafletLayer
  circle(coords: [number, number], options?: unknown): LeafletLayer
  geoJSON(data: unknown, options?: unknown): LeafletLayer
  latLngBounds(coords?: Array<[number, number]>): { isValid(): boolean; extend(coords: [number, number]): void; [key: string]: unknown }
  [key: string]: unknown
}

function getLeaflet(): LeafletLib | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { L?: LeafletLib }).L ?? null
}

export function LocationMap({ locations }: { locations: Location[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layersRef = useRef<LeafletLayer[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const { isReady: isLeafletReady } = useLeafletReady()
  
  // Initialize map ONCE when Leaflet is ready
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || mapRef.current) return
    
    const L = getLeaflet()
    if (!L) return
    
    console.log('[LocationMap] Initializing map')
    
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: true,
    })
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    
    mapRef.current = map
    setIsMapReady(true)
    
    console.log('[LocationMap] ✅ Map initialized')
    
    return () => {
      console.log('[LocationMap] Cleaning up map')
      map.remove()
      mapRef.current = null
    }
  }, [isLeafletReady])
  
  // Render locations whenever they change
  useEffect(() => {
    const map = mapRef.current
    const L = getLeaflet()
    
    if (!isMapReady || !map || !L || locations.length === 0) {
      console.log('[LocationMap] Skip render:', { isMapReady, hasMap: !!map, hasL: !!L, locationCount: locations.length })
      return
    }
    
    console.log('[LocationMap] Rendering', locations.length, 'locations')
    
    // Clear previous layers (except tile layer)
    layersRef.current.forEach(layer => map.removeLayer(layer))
    layersRef.current = []
    
    const bounds = L.latLngBounds()
    
    locations.forEach(loc => {
      const lat = loc.coordinates[1]
      const lng = loc.coordinates[0]
      const color = loc.mode === 'include' ? '#16A34A' : '#DC2626'
      
      console.log('[LocationMap] Rendering location:', {
        name: loc.name,
        mode: loc.mode,
        type: loc.type,
        hasGeometry: !!loc.geometry,
        hasBbox: !!loc.bbox
      })
      
      // Add center pin (white with colored border)
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#FFFFFF',
        color,
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(map) as LeafletLayer & { bindPopup: (content: string) => LeafletLayer }
      
      marker.bindPopup(`<b>${loc.name}</b><br/>${loc.mode === 'include' ? '✓ Included' : '✗ Excluded'}`)
      layersRef.current.push(marker)
      bounds.extend([lat, lng])
      
      // Add coverage visualization
      if (loc.geometry) {
        // City/Region/Country - show full boundary coverage
        try {
          const geoLayer = L.geoJSON(loc.geometry, {
            style: {
              fillColor: color,
              fillOpacity: 0.3,
              color,
              weight: 2,
              opacity: 1,
            }
          }).addTo(map)
          layersRef.current.push(geoLayer)
          console.log('[LocationMap] ✅ Added tile coverage for:', loc.name)
        } catch (error) {
          console.error('[LocationMap] Geometry error for', loc.name, error)
        }
      } else if (loc.type === 'radius' && loc.radius) {
        // Radius - show circle coverage
        const radiusInMeters = loc.radius * 1609.34
        const circle = L.circle([lat, lng], {
          radius: radiusInMeters,
          fillColor: color,
          fillOpacity: 0.25,
          color,
          weight: 2,
          opacity: 0.8,
        }).addTo(map)
        layersRef.current.push(circle)
        console.log('[LocationMap] ✅ Added radius coverage for:', loc.name)
      } else if (loc.bbox) {
        // Fallback - show bounding box
        const bounds: [[number, number], [number, number]] = [
          [loc.bbox[1], loc.bbox[0]],
          [loc.bbox[3], loc.bbox[2]]
        ]
        const rectangle = (L as unknown as { rectangle: (bounds: [[number, number], [number, number]], options: unknown) => LeafletLayer }).rectangle(bounds, {
          fillColor: color,
          fillOpacity: 0.25,
          color,
          weight: 2,
        }).addTo(map)
        layersRef.current.push(rectangle)
        console.log('[LocationMap] ✅ Added bbox coverage for:', loc.name)
      }
    })
    
    // Fit bounds to show all locations
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
      console.log('[LocationMap] ✅ Fitted bounds to', locations.length, 'locations')
    }
  }, [locations, isMapReady])
  
  if (!isLeafletReady) {
    return (
      <div className="w-full h-[400px] rounded-lg border-2 border-blue-600 bg-card flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full h-[400px] rounded-lg border-2 border-blue-600 bg-card overflow-hidden relative">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  )
}

