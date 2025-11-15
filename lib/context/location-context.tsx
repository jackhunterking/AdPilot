/**
 * Feature: Ad-scoped location targeting with backward compatibility
 * Purpose: Store location targeting per-ad to prevent location bleeding across ads
 * References:
 *  - React useEffect: https://react.dev/reference/react/useEffect
 *  - Supabase Database (patterns): https://supabase.com/docs/guides/database
 *  - Ad-level architecture: /docs/AD_LEVEL_ARCHITECTURE_IMPLEMENTATION.md
 */
"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useCurrentAd } from "@/lib/context/current-ad-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"
import { logger } from "@/lib/utils/logger"

interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
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

type LocationStatus = "idle" | "selecting" | "setup-in-progress" | "completed" | "error"

interface LocationState {
  locations: Location[]
  status: LocationStatus
  errorMessage?: string
}

interface LocationContextType {
  locationState: LocationState
  addLocations: (locations: Location[], shouldMerge?: boolean) => void
  removeLocation: (id: string) => void
  updateStatus: (status: LocationStatus) => void
  setError: (message: string) => void
  resetLocations: () => void
  clearLocations: () => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaignContext()
  const { currentAd, updateAdSnapshot } = useCurrentAd()
  const [locationState, setLocationState] = useState<LocationState>({
    locations: [],
    status: "idle",
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasUserEdited, setHasUserEdited] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedLocationState = useMemo(() => locationState, [locationState])

  // PHASE 1: Load from ad snapshot FIRST, fallback to campaign (backward compatible)
  useEffect(() => {
    if (!currentAd) {
      // No ad selected - reset to empty state
      logger.debug('LocationContext', 'No current ad - resetting to empty state')
      setLocationState({
        locations: [],
        status: "idle",
        errorMessage: undefined,
      })
      setIsInitialized(true)
      setHasUserEdited(false)
      return
    }
    
    logger.debug('LocationContext', `Loading location state for ad ${currentAd.id}`)
    
    // Try ad-scoped location FIRST (new architecture)
    const locationSnapshot = currentAd.setup_snapshot?.location as LocationState | null | undefined
    
    if (locationSnapshot && typeof locationSnapshot === 'object') {
      logger.debug('LocationContext', '✅ Loading from ad snapshot (ad-scoped)', {
        locationsCount: locationSnapshot.locations?.length || 0,
        status: locationSnapshot.status
      })
      
      const normalized: LocationState = {
        locations: locationSnapshot.locations || [],
        status: locationSnapshot.status || ((locationSnapshot.locations?.length ?? 0) > 0 ? "completed" : "idle"),
        errorMessage: locationSnapshot.errorMessage,
      }
      
      setLocationState(normalized)
    } else {
      // Fallback to campaign-level location data (existing behavior for backward compatibility)
      const rawSaved = campaign?.campaign_states?.location_data as unknown as LocationState | null
      
      if (rawSaved && typeof rawSaved === 'object') {
        logger.debug('LocationContext', '⚠️ Fallback to campaign-level location (legacy)', {
          locationsCount: rawSaved.locations?.length || 0
        })
        
        const normalized: LocationState = {
          locations: rawSaved.locations ?? [],
          status: rawSaved.status ?? ((rawSaved.locations?.length ?? 0) > 0 ? "completed" : "idle"),
          errorMessage: rawSaved.errorMessage,
        }
        
        setLocationState(normalized)
      } else {
        // No location data anywhere - initialize empty
        logger.debug('LocationContext', 'No location data found - initializing empty state')
        setLocationState({
          locations: [],
          status: "idle",
          errorMessage: undefined,
        })
      }
    }
    
    setIsInitialized(true)
    setHasUserEdited(false) // Reset edit flag when switching ads
  }, [currentAd?.id, campaign?.campaign_states?.location_data]) // Watch both sources

  // PHASE 2: Save to BOTH ad snapshot AND campaign_states (dual write for safety)
  const saveFn = useCallback(async (state: LocationState) => {
    if (!campaign?.id || !isInitialized) {
      logger.debug('LocationContext', 'Skipping save - no campaign or not initialized')
      return
    }
    
    logger.debug('LocationContext', '💾 Saving location state (dual write)', {
      toCampaign: true,
      toAd: !!currentAd?.id,
      locationsCount: state.locations.length
    })
    
    // Save to campaign_states (existing behavior - keep for backward compatibility)
    await saveCampaignState('location_data', state as unknown as Record<string, unknown>)
    
    // ALSO save to ad snapshot (new behavior - will become primary after migration)
    if (currentAd?.id) {
      await updateAdSnapshot({
        location: {
          locations: state.locations,
          status: state.status,
          errorMessage: state.errorMessage,
        }
      })
    }
  }, [campaign?.id, currentAd?.id, saveCampaignState, updateAdSnapshot, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedLocationState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  const addLocations = (newLocations: Location[], shouldMerge: boolean = true) => {
    setLocationState(prev => {
      setHasUserEdited(true)
      let finalLocations: Location[];
      
      if (shouldMerge) {
        // Merge locations, avoiding duplicates by name+mode
        const existingMap = new Map(prev.locations.map(loc => [`${loc.name}-${loc.mode}`, loc]))
        
        newLocations.forEach(newLoc => {
          existingMap.set(`${newLoc.name}-${newLoc.mode}`, newLoc)
        })
        
        finalLocations = Array.from(existingMap.values())
      } else {
        // Replace all locations (don't bring back removed ones)
        finalLocations = newLocations
      }
      
      return {
        ...prev,
        locations: finalLocations,
        status: finalLocations.length > 0 ? "completed" : "idle",
        errorMessage: undefined
      }
    })
  }

  const removeLocation = (id: string) => {
    setLocationState(prev => {
      setHasUserEdited(true)
      const updatedLocations = prev.locations.filter(loc => loc.id !== id)
      return {
        ...prev,
        locations: updatedLocations,
        status: updatedLocations.length > 0 ? "completed" : "idle"
      }
    })
  }

  const updateStatus = (status: LocationStatus) => {
    setLocationState(prev => ({ ...prev, status }))
  }

  const setError = (message: string) => {
    setLocationState(prev => ({ ...prev, errorMessage: message, status: "error" }))
  }

  const resetLocations = () => {
    setLocationState(prev => ({
      ...prev,
      status: "idle"
    }))
  }

  const clearLocations = () => {
    setHasUserEdited(true)
    setLocationState({
      locations: [],
      status: "idle",
      errorMessage: undefined,
    })
  }

  return (
    <LocationContext.Provider 
      value={{ 
        locationState, 
        addLocations,
        removeLocation,
        updateStatus, 
        setError, 
        resetLocations,
        clearLocations
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider")
  }
  return context
}


