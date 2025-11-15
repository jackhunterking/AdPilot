/**
 * Feature: Ad-level location targeting
 * Purpose: Store location targeting per-ad with single source of truth
 * References:
 *  - React useEffect: https://react.dev/reference/react/useEffect
 *  - Supabase Database (patterns): https://supabase.com/docs/guides/database
 */
"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
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
  startLocationSetup: () => { adId: string }
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const { currentAd, updateAdSnapshot } = useCurrentAd()
  const [locationState, setLocationState] = useState<LocationState>({
    locations: [],
    status: "idle",
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedLocationState = useMemo(() => locationState, [locationState])

  // SINGLE SOURCE: Load from ad snapshot only
  useEffect(() => {
    console.log('[DEBUG] ========== LocationContext LOADING ==========');
    console.log('[DEBUG] Current ad:', currentAd?.id);
    
    if (!currentAd) {
      // No ad selected - reset to empty state
      logger.debug('LocationContext', 'No current ad - resetting to empty state')
      console.log('[DEBUG] No ad - resetting to empty state');
      setLocationState({
        locations: [],
        status: "idle",
        errorMessage: undefined,
      })
      setIsInitialized(true)
      return
    }
    
    logger.debug('LocationContext', `Loading location state for ad ${currentAd.id}`)
    console.log('[DEBUG] Loading location state for ad:', currentAd.id);
    
    // Load from ad-scoped location only
    const locationSnapshot = currentAd.setup_snapshot?.location as LocationState | null | undefined
    console.log('[DEBUG] Raw snapshot from DB:', locationSnapshot);
    console.log('[DEBUG] Snapshot type:', typeof locationSnapshot);
    
    if (locationSnapshot && typeof locationSnapshot === 'object') {
      const locationsArray = locationSnapshot.locations || [];
      console.log('[DEBUG] Locations array:', {
        count: locationsArray.length,
        locations: locationsArray.map((l: Location) => ({
          name: l.name,
          hasGeometry: !!l.geometry,
          geometryType: l.geometry?.type,
          hasBbox: !!l.bbox,
          hasCoordinates: !!l.coordinates
        }))
      });
      
      logger.debug('LocationContext', '✅ Loading from ad snapshot', {
        locationsCount: locationSnapshot.locations?.length || 0,
        status: locationSnapshot.status
      })
      
      const normalized: LocationState = {
        locations: locationSnapshot.locations || [],
        status: locationSnapshot.status || ((locationSnapshot.locations?.length ?? 0) > 0 ? "completed" : "idle"),
        errorMessage: locationSnapshot.errorMessage,
      }
      
      console.log('[DEBUG] Normalized state:', {
        locationCount: normalized.locations.length,
        status: normalized.status,
        hasError: !!normalized.errorMessage
      });
      
      setLocationState(normalized)
    } else {
      // No location data - initialize empty
      logger.debug('LocationContext', 'No location data found - initializing empty state')
      console.log('[DEBUG] No location snapshot - initializing empty');
      setLocationState({
        locations: [],
        status: "idle",
        errorMessage: undefined,
      })
    }
    
    setIsInitialized(true)
    console.log('[DEBUG] ========== LocationContext LOAD COMPLETE ==========');
  }, [currentAd?.id])

  // SINGLE SAVE PATH: Ad snapshot only
  const saveFn = useCallback(async (state: LocationState) => {
    console.log('[DEBUG] ========== LocationContext SAVING ==========');
    console.log('[DEBUG] Save triggered for ad:', currentAd?.id);
    console.log('[DEBUG] Is initialized:', isInitialized);
    
    if (!currentAd?.id || !isInitialized) {
      logger.debug('LocationContext', 'Skipping save - no ad or not initialized')
      console.log('[DEBUG] Skipping save - no ad or not initialized');
      return
    }
    
    logger.debug('LocationContext', '💾 Saving location state to ad snapshot', {
      adId: currentAd.id,
      locationsCount: state.locations.length
    })
    
    console.log('[DEBUG] Saving state:', {
      locationCount: state.locations.length,
      status: state.status,
      locations: state.locations.map(l => ({
        name: l.name,
        hasGeometry: !!l.geometry,
        geometryType: l.geometry?.type,
        hasBbox: !!l.bbox,
        hasCoordinates: !!l.coordinates,
        hasId: !!l.id
      }))
    });
    
    // Save to ad snapshot only (ensure status is never null)
    await updateAdSnapshot({
      location: {
        locations: state.locations,
        status: state.status || 'completed',  // Default to 'completed' if somehow null
      }
    })
    
    console.log('[DEBUG] ✅ Save complete');
    console.log('[DEBUG] ========== LocationContext SAVE COMPLETE ==========');
  }, [currentAd?.id, updateAdSnapshot, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedLocationState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  const addLocations = (newLocations: Location[], shouldMerge: boolean = true) => {
    setLocationState(prev => {
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
    setLocationState({
      locations: [],
      status: "idle",
      errorMessage: undefined,
    })
  }

  // NEW: Direct method to start location setup (replaces event-based trigger)
  const startLocationSetup = useCallback(() => {
    if (!currentAd?.id) {
      throw new Error('Cannot set up location without an active ad')
    }
    logger.debug('LocationContext', 'Starting location setup', { adId: currentAd.id })
    return { adId: currentAd.id }
  }, [currentAd?.id])

  return (
    <LocationContext.Provider 
      value={{ 
        locationState, 
        addLocations,
        removeLocation,
        updateStatus, 
        setError, 
        resetLocations,
        clearLocations,
        startLocationSetup
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


