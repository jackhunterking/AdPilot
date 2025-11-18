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
import { useCampaignContext } from "@/lib/context/campaign-context"
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
  const { currentAd } = useCurrentAd()
  const { campaign } = useCampaignContext()
  const [locationState, setLocationState] = useState<LocationState>({
    locations: [],
    status: "idle",
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from backend (single source of truth)
  // ARCHITECTURE NOTE: Locations are stored in ad_target_locations TABLE (not a JSON column)
  // The /snapshot API reads from ad_target_locations and builds a runtime snapshot object
  // See: lib/services/ad-data-service.ts buildSnapshot() - line 550
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
    
    const loadLocationsFromBackend = async () => {
      try {
        logger.debug('LocationContext', `Loading locations from backend for ad ${currentAd.id}`)
        
        // Fetch locations from ad_target_locations table via snapshot API
        // API reads from database table and builds snapshot.location object dynamically
        const response = await fetch(`/api/campaigns/${campaign?.id}/ads/${currentAd.id}/snapshot`)
        
        if (!response.ok) {
          logger.warn('LocationContext', 'Failed to load snapshot, starting empty')
          setLocationState({ locations: [], status: "idle", errorMessage: undefined })
          setIsInitialized(true)
          return
        }
        
        const apiResponse = await response.json()
        // NOTE: setup_snapshot.location.locations is built from ad_target_locations table
        // It's NOT a database column - it's a runtime transformation
        const locationsFromDB = apiResponse.setup_snapshot?.location?.locations || []
        
        if (locationsFromDB.length > 0) {
          logger.info('LocationContext', `✅ Loaded ${locationsFromDB.length} locations from ad_target_locations table`)
          setLocationState({
            locations: locationsFromDB,
            status: "completed",
            errorMessage: undefined
          })
        } else {
          logger.debug('LocationContext', 'No locations in ad_target_locations table, starting empty')
          setLocationState({ locations: [], status: "idle", errorMessage: undefined })
        }
        
        setIsInitialized(true)
      } catch (err) {
        logger.error('LocationContext', 'Error loading locations from backend', err)
        setLocationState({ locations: [], status: "idle", errorMessage: undefined })
        setIsInitialized(true)
      }
    }
    
    loadLocationsFromBackend()
  }, [currentAd?.id, campaign?.id])

  // Add locations to local state (triggers autosave which writes to ad_target_locations table)
  // ARCHITECTURE: This updates React state only. Actual database write happens via autosave.
  // See: lib/hooks/use-draft-auto-save.ts (reads locationState, writes to table)
  const addLocations = useCallback(async (newLocations: Location[], shouldMerge: boolean = true) => {
    if (!newLocations || newLocations.length === 0) {
      console.error('[LocationContext] ❌ Empty locations array');
      throw new Error('Cannot add empty locations');
    }
    
    if (!currentAd?.id) {
      console.error('[LocationContext] ❌ No current ad');
      throw new Error('No current ad selected');
    }
    
    try {
      // Calculate final locations
      let finalLocations: Location[];
      
      if (shouldMerge) {
        // ADD mode: Merge with existing, deduplicate by name+mode
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
      
      // Update React state (triggers re-render and autosave)
      const newState: LocationState = {
        locations: finalLocations.map(loc => ({ ...loc })),
        status: 'completed',
        errorMessage: undefined
      };
      
      setLocationState(newState);
      
      // Small delay to ensure state update completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('[LocationContext] ❌ Failed to update location state:', error);
      setLocationState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Failed to save location'
      }));
      throw error;
    }
  }, [currentAd?.id, locationState.locations]);

  const removeLocation = useCallback(async (id: string) => {
    if (!currentAd?.id) {
      console.error('[LocationContext] No current ad - cannot remove');
      return;
    }
    
    try {
      // Calculate updated locations
      const updatedLocations = locationState.locations.filter(loc => loc.id !== id);
      
      // Update local state (autosave will write to ad_target_locations table)
      setLocationState({
        locations: updatedLocations,
        status: updatedLocations.length > 0 ? 'completed' : 'idle',
        errorMessage: undefined
      });
      
    } catch (error) {
      console.error('[LocationContext] ❌ Failed to remove location:', error);
      throw error;
    }
  }, [currentAd?.id, locationState.locations]);

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


