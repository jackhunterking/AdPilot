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
    if (!currentAd) {
      // No ad selected - reset to empty state
      logger.debug('LocationContext', 'No current ad - resetting to empty state')
      setLocationState({
        locations: [],
        status: "idle",
        errorMessage: undefined,
      })
      setIsInitialized(true)
      return
    }
    
    logger.debug('LocationContext', `Loading location state for ad ${currentAd.id}`)
    
    // Load from normalized ad_target_locations table instead of setup_snapshot
    // Note: setup_snapshot column was removed - data is now in ad_target_locations table
    // For now, start with empty state - locations will be loaded via API if needed
    const locationSnapshot = null as LocationState | null
    
    if (false) {  // Skip deprecated snapshot loading
      logger.debug('LocationContext', '✅ Loading from ad snapshot', {
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
      // No location data - initialize empty
      logger.debug('LocationContext', 'No location data found - initializing empty state')
      setLocationState({
        locations: [],
        status: "idle",
        errorMessage: undefined,
      })
    }
    
    setIsInitialized(true)
  }, [currentAd?.id])

  // SINGLE SAVE PATH: Ad snapshot only (kept for backward compatibility, not used with immediate writes)
  const saveFn = useCallback(async (state: LocationState) => {
    if (!currentAd?.id || !isInitialized) {
      logger.debug('LocationContext', 'Skipping save - no ad or not initialized')
      return
    }
    
    logger.debug('LocationContext', '💾 Saving location state to ad snapshot', {
      adId: currentAd.id,
      locationsCount: state.locations.length
    })
    
    // Save to ad snapshot only (ensure status is never null)
    await updateAdSnapshot({
      location: {
        locations: state.locations,
        status: state.status || 'completed',  // Default to 'completed' if somehow null
      }
    })
  }, [currentAd?.id, updateAdSnapshot, isInitialized])

  // Note: useAutoSave removed - using immediate database writes instead

  const addLocations = useCallback(async (newLocations: Location[], shouldMerge: boolean = true) => {
    if (!newLocations || newLocations.length === 0) {
      console.error('[LocationContext] Empty locations array');
      return;
    }
    
    if (!currentAd?.id) {
      console.error('[LocationContext] No current ad - cannot save');
      return;
    }
    
    console.log('[LocationContext] Adding locations (DB-first):', {
      adId: currentAd.id,
      newCount: newLocations.length,
      mode: shouldMerge ? 'ADD/merge' : 'REPLACE',
      currentCount: locationState.locations.length
    });
    
    try {
      // Calculate final locations OUTSIDE setState
      let finalLocations: Location[];
      
      if (shouldMerge) {
        // ADD mode: Merge with existing locations, deduplicate by name+mode
        const existingMap = new Map(
          locationState.locations.map(loc => [`${loc.name}-${loc.mode}`, loc])
        );
        
        newLocations.forEach(newLoc => {
          existingMap.set(`${newLoc.name}-${newLoc.mode}`, newLoc);
        });
        
        finalLocations = Array.from(existingMap.values());
      } else {
        // REPLACE mode: Use only new locations
        finalLocations = newLocations;
      }
      
      console.log('[LocationContext] Final location count:', finalLocations.length);
      
      // WRITE DIRECTLY TO DATABASE (blocking call - wait for completion)
      console.log('[LocationContext] Writing to database...');
      await updateAdSnapshot({
        location: {
          locations: finalLocations,
          status: 'completed'
        }
      });
      
      console.log('[LocationContext] ✅ Database write successful');
      
      // Update local state to MATCH database
      setLocationState({
        locations: finalLocations,
        status: 'completed',
        errorMessage: undefined
      });
      
      console.log('[LocationContext] ✅ Local state synchronized with database');
      
    } catch (error) {
      console.error('[LocationContext] ❌ Database write failed:', error);
      setLocationState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Failed to save location'
      }));
      throw error;
    }
  }, [currentAd?.id, locationState.locations, updateAdSnapshot]);

  const removeLocation = useCallback(async (id: string) => {
    if (!currentAd?.id) {
      console.error('[LocationContext] No current ad - cannot remove');
      return;
    }
    
    console.log('[LocationContext] Removing location:', id);
    
    try {
      // Calculate updated locations
      const updatedLocations = locationState.locations.filter(loc => loc.id !== id);
      
      console.log('[LocationContext] Remaining locations:', updatedLocations.length);
      
      // WRITE TO DATABASE FIRST
      await updateAdSnapshot({
        location: {
          locations: updatedLocations,
          status: updatedLocations.length > 0 ? 'completed' : 'idle'
        }
      });
      
      console.log('[LocationContext] ✅ Removed from database');
      
      // Update local state to match database
      setLocationState({
        locations: updatedLocations,
        status: updatedLocations.length > 0 ? 'completed' : 'idle',
        errorMessage: undefined
      });
      
    } catch (error) {
      console.error('[LocationContext] ❌ Failed to remove location:', error);
      throw error;
    }
  }, [currentAd?.id, locationState.locations, updateAdSnapshot]);

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


