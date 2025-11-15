"use server"

/**
 * Feature: Geocoding with OpenStreetMap Nominatim API
 * Purpose: Convert location names to coordinates and fetch boundaries
 * References:
 *  - Nominatim API: https://nominatim.org/release-docs/develop/api/Search/
 */

// ============================================================================
// TYPES
// ============================================================================

interface GeocodingError {
  code: 'NOT_FOUND' | 'API_ERROR' | 'INVALID_INPUT'
  message: string
}

interface GeocodingResult {
  success: boolean
  data?: {
    place_name: string
    center: [number, number] // [longitude, latitude]
    bbox: [number, number, number, number] | null // [minLng, minLat, maxLng, maxLat]
    place_type: string[]
  }
  error?: GeocodingError
}

interface BoundaryResult {
  geometry: GeoJSONGeometry
  bbox: [number, number, number, number] | null
  adminLevel: number
  source: string
}

interface GeoJSONGeometry {
  type: string
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

interface NominatimResult {
  display_name: string
  lon: string
  lat: string
  boundingbox?: string[]
  type: string
}

// ============================================================================
// CACHE
// ============================================================================

// Simple in-memory cache for geocoding results
// In production, consider using Redis or similar
const geocodeCache = new Map<string, GeocodingResult>()
const boundaryCache = new Map<string, BoundaryResult | null>()

// Clear cache after 1 hour to avoid stale data
const CACHE_TTL = 60 * 60 * 1000 // 1 hour
let lastCacheClear = Date.now()

function checkCacheTTL() {
  const now = Date.now()
  if (now - lastCacheClear > CACHE_TTL) {
    geocodeCache.clear()
    boundaryCache.clear()
    lastCacheClear = now
    console.log('[Geocoding] Cache cleared due to TTL')
  }
}

// ============================================================================
// MAIN GEOCODING FUNCTION
// ============================================================================

/**
 * Search for a location and get its coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * 
 * @param query - Location name to search (e.g., "Toronto, Ontario, Canada")
 * @returns GeocodingResult with coordinates and bbox, or error
 */
export async function searchLocations(query: string): Promise<GeocodingResult> {
  // Check cache TTL
  checkCacheTTL()
  
  // Validate input
  if (!query || typeof query !== 'string') {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Location name is required'
      }
    }
  }
  
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Location name must be at least 2 characters'
      }
    }
  }
  
  // Normalize for cache key
  const normalized = trimmed.toLowerCase()
  
  // Check cache
  if (geocodeCache.has(normalized)) {
    console.log('[Geocoding] Cache hit for:', query)
    return geocodeCache.get(normalized)!
  }
  
  try {
    console.log('[Geocoding] Searching for:', query)
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AdPilot-LocationTargeting/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json() as NominatimResult[]
    
    if (!data || data.length === 0) {
      const result: GeocodingResult = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Location "${query}" not found. Try a more specific name (e.g., "Toronto, Ontario, Canada")`
        }
      }
      geocodeCache.set(normalized, result)
      return result
    }
    
    const item = data[0]
    
    // Parse bounding box if available
    let bbox: [number, number, number, number] | null = null
    if (Array.isArray(item.boundingbox) && item.boundingbox.length >= 4) {
      const minLng = parseFloat(item.boundingbox[2]!)
      const minLat = parseFloat(item.boundingbox[0]!)
      const maxLng = parseFloat(item.boundingbox[3]!)
      const maxLat = parseFloat(item.boundingbox[1]!)
      
      if (Number.isFinite(minLng) && Number.isFinite(minLat) && 
          Number.isFinite(maxLng) && Number.isFinite(maxLat)) {
        bbox = [minLng, minLat, maxLng, maxLat]
      }
    }
    
    const result: GeocodingResult = {
      success: true,
      data: {
        place_name: item.display_name,
        center: [parseFloat(item.lon), parseFloat(item.lat)],
        bbox,
        place_type: [item.type]
      }
    }
    
    // Cache the result
    geocodeCache.set(normalized, result)
    console.log('[Geocoding] Success:', item.display_name)
    
    return result
    
  } catch (error) {
    console.error('[Geocoding] API error:', error)
    const result: GeocodingResult = {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Geocoding service unavailable'
      }
    }
    return result
  }
}

// ============================================================================
// BOUNDARY FETCHING
// ============================================================================

/**
 * Fetch detailed boundary geometry for a location
 * Returns GeoJSON geometry for rendering on map
 * 
 * @param coordinates - [longitude, latitude] from geocoding
 * @param placeName - Full place name for lookup
 * @returns BoundaryResult with GeoJSON geometry, or null if not available
 */
export async function getLocationBoundary(
  coordinates: [number, number],
  placeName: string
): Promise<BoundaryResult | null> {
  // Check cache TTL
  checkCacheTTL()
  
  // Check cache
  const cacheKey = `${placeName}-${coordinates.join(',')}`
  if (boundaryCache.has(cacheKey)) {
    console.log('[Boundary] Cache hit for:', placeName)
    return boundaryCache.get(cacheKey) || null
  }
  
  try {
    console.log('[Boundary] Fetching boundary for:', placeName)
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=geojson&polygon_geojson=1&limit=1`,
      {
        headers: {
          'User-Agent': 'AdPilot-LocationTargeting/1.0'
        }
      }
    )
    
    if (!response.ok) {
      console.warn('[Boundary] HTTP error:', response.status)
      boundaryCache.set(cacheKey, null)
      return null
    }
    
    const data = await response.json()
    
    if (!data.features || data.features.length === 0) {
      console.warn('[Boundary] No features found for:', placeName)
      boundaryCache.set(cacheKey, null)
      return null
    }
    
    const feature = data.features[0]
    
    if (!feature.geometry) {
      console.warn('[Boundary] No geometry in feature for:', placeName)
      boundaryCache.set(cacheKey, null)
      return null
    }
    
    // Calculate bbox from geometry if not provided
    const bbox = feature.bbox 
      ? [feature.bbox[0], feature.bbox[1], feature.bbox[2], feature.bbox[3]] as [number, number, number, number]
      : calculateBBoxFromGeometry(feature.geometry as GeoJSONGeometry)
    
    const result: BoundaryResult = {
      geometry: feature.geometry as GeoJSONGeometry,
      bbox,
      adminLevel: 8,
      source: 'OpenStreetMap'
    }
    
    // Cache the result
    boundaryCache.set(cacheKey, result)
    console.log('[Boundary] Success for:', placeName)
    
    return result
    
  } catch (error) {
    console.error('[Boundary] Error fetching boundary:', error)
    boundaryCache.set(cacheKey, null)
    return null
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate bounding box from GeoJSON geometry
 * Recursively processes coordinates to find min/max bounds
 */
function calculateBBoxFromGeometry(geometry: GeoJSONGeometry): [number, number, number, number] | null {
  if (!geometry || !geometry.coordinates) return null

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  const processCoords = (coords: number[] | number[][] | number[][][] | number[][][][]): void => {
    // Check if this is a coordinate pair [lng, lat]
    if (Array.isArray(coords) && 
        coords.length >= 2 &&
        typeof coords[0] === 'number' && 
        typeof coords[1] === 'number') {
      const lng = coords[0] as number
      const lat = coords[1] as number
      
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
    } 
    // Otherwise, it's an array of coordinates - recurse
    else if (Array.isArray(coords)) {
      for (const item of coords) {
        processCoords(item as number[] | number[][] | number[][][] | number[][][][])
      }
    }
  }

  processCoords(geometry.coordinates)

  if (!Number.isFinite(minLng)) {
    return null
  }
  
  return [minLng, minLat, maxLng, maxLat]
}

/**
 * Clear the geocoding cache manually if needed
 * Useful for testing or when data becomes stale
 */
export async function clearGeocodingCache(): Promise<void> {
  geocodeCache.clear()
  boundaryCache.clear()
  lastCacheClear = Date.now()
  console.log('[Geocoding] Cache manually cleared')
}
