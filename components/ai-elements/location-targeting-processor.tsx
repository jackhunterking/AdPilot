"use client"

/**
 * Feature: Location Targeting Processor
 * Purpose: Process locationTargeting tool calls - geocode, fetch boundaries, update state
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { useEffect } from 'react'
import { useLocation } from '@/lib/context/location-context'
import { toast } from 'sonner'
import { searchLocations, getLocationBoundary } from '@/app/actions/geocoding'
import { searchMetaLocation } from '@/app/actions/meta-location-search'
import { Loader2 } from 'lucide-react'

interface LocationTargetingProcessorProps {
  toolCallId: string
  input: {
    locations: Array<{
      name: string
      type: 'city' | 'region' | 'country' | 'radius'
      mode: 'include' | 'exclude'
      radius?: number
    }>
    explanation?: string
  }
  onComplete: (output: {
    locations: Array<{
      id: string
      name: string
      type: string
      mode: string
    }>
    failedCount: number
  }) => void
  onError: (error: string) => void
}

export function LocationTargetingProcessor({ 
  toolCallId, 
  input, 
  onComplete, 
  onError 
}: LocationTargetingProcessorProps) {
  const { addLocations, updateStatus } = useLocation()
  
  useEffect(() => {
    let cancelled = false
    
    const processLocations = async () => {
      updateStatus('setup-in-progress')
      
      try {
        console.log('[LocationProcessor] Processing locations:', input.locations)
        
        // Process all locations in parallel
        const processed = await Promise.all(
          input.locations.map(async (loc) => {
            console.log(`[LocationProcessor] Geocoding: ${loc.name}`)
            
            // Geocode with OpenStreetMap
            const geoResult = await searchLocations(loc.name)
            
            if (!geoResult.success) {
              console.warn(`[LocationProcessor] Failed to geocode: ${loc.name}`, geoResult.error)
              return null
            }
            
            const { place_name, center, bbox } = geoResult.data!
            console.log(`[LocationProcessor] Geocoded: ${place_name}`)
            
            // Get boundary geometry for non-radius types (for map display)
            let geometry = undefined
            if (loc.type !== 'radius') {
              const boundaryData = await getLocationBoundary(center, place_name)
              if (boundaryData) {
                geometry = boundaryData.geometry
                console.log(`[LocationProcessor] Boundary fetched for: ${place_name}`)
              }
            }
            
            // Get Meta location key (required for publishing)
            // For radius types, use 'city' since radius targeting is centered on a city
            const metaLocationType = loc.type === 'radius' ? 'city' : loc.type
            const metaResult = await searchMetaLocation(place_name, center, metaLocationType)
            if (metaResult) {
              console.log(`[LocationProcessor] Meta key found for: ${place_name}`)
            } else {
              console.warn(`[LocationProcessor] No Meta key for: ${place_name} (will need for publishing)`)
            }
            
            return {
              id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: place_name,
              coordinates: center,
              radius: loc.radius || 30,
              type: loc.type,
              mode: loc.mode,
              bbox: bbox || undefined,
              geometry,
              key: metaResult?.key, // Meta location key
              country_code: metaResult?.country_code
            }
          })
        )
        
        // Filter out failed geocoding attempts
        const validLocations = processed.filter((loc): loc is NonNullable<typeof loc> => loc !== null)
        
        if (cancelled) return
        
        if (validLocations.length === 0) {
          throw new Error('Failed to geocode any locations. Please check the location names and try again.')
        }
        
        console.log(`[LocationProcessor] Successfully processed ${validLocations.length}/${input.locations.length} locations`)
        
        // Update location context (this triggers auto-save to ad snapshot)
        addLocations(validLocations, false) // false = replace, not merge
        updateStatus('completed')
        
        // Show success toast
        const locationNames = validLocations.map(l => l.name).join(', ')
        toast.success(
          validLocations.length === 1 
            ? `Location set to ${locationNames}` 
            : `Locations set to ${locationNames}`
        )
        
        // Send success result to AI
        onComplete({
          locations: validLocations.map(l => ({
            id: l.id,
            name: l.name,
            type: l.type,
            mode: l.mode
          })),
          failedCount: input.locations.length - validLocations.length
        })
        
      } catch (error) {
        if (cancelled) return
        
        console.error('[LocationProcessor] Error:', error)
        updateStatus('error')
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to set location targeting'
        
        toast.error(errorMessage)
        onError(errorMessage)
      }
    }
    
    processLocations()
    
    return () => { 
      cancelled = true 
    }
  }, [toolCallId, input, addLocations, updateStatus, onComplete, onError])
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground my-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Setting up location targeting...</span>
    </div>
  )
}

