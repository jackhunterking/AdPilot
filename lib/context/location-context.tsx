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
        const response = await fetch(`/api/campaigns/${campaign?.id}/ads/${currentAd.id}/snapshot`)
        
        if (!response.ok) {
          logger.warn('LocationContext', 'Failed to load snapshot, starting empty')
          setLocationState({ locations: [], status: "idle", errorMessage: undefined })
          setIsInitialized(true)
          return
        }
        
        const json = await response.json()
        const snapshot = json.setup_snapshot
        
        if (snapshot?.location?.locations && snapshot.location.locations.length > 0) {
          logger.info('LocationContext', `✅ Loaded ${snapshot.location.locations.length} locations from backend`)
          setLocationState({
            locations: snapshot.location.locations,
            status: "completed",
            errorMessage: undefined
          })
        } else {
          logger.debug('LocationContext', 'No locations in backend, starting empty (new ad)')
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
      
      // Update local state (autosave triggered by caller)
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
  }, [currentAd?.id, locationState.locations]);

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
      
      // Update local state (autosave triggered by caller)
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


