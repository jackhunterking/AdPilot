/**
 * Feature: Location state hydration guard
 * Purpose: Prevent autosave from overwriting restored location_data and normalize restored state
 * References:
 *  - React useEffect: https://react.dev/reference/react/useEffect
 *  - Supabase Database (patterns): https://supabase.com/docs/guides/database
 */
"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
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
  const [locationState, setLocationState] = useState<LocationState>({
    locations: [],
    status: "idle",
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [hydrationAttempted, setHydrationAttempted] = useState(false)
  // Prevent fallback hydration from restoring locations after the user explicitly cleared/edited
  const [hasUserEdited, setHasUserEdited] = useState(false)
  const [fallbackAttempted, setFallbackAttempted] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedLocationState = useMemo(() => locationState, [locationState])

  // Phase 1: hydrate from campaign state ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || hydrationAttempted) return

    const rawSaved = campaign.campaign_states?.location_data as unknown as LocationState | null
    if (rawSaved) {
      const normalized: LocationState = {
        locations: rawSaved.locations ?? [],
        status: rawSaved.status ?? ((rawSaved.locations?.length ?? 0) > 0 ? "completed" : "idle"),
        errorMessage: rawSaved.errorMessage,
      }
      logger.debug('LocationContext', '✅ Restoring location state', normalized)
      setLocationState(normalized)
    }

    setHydrationAttempted(true)
  }, [campaign, hydrationAttempted])

  // Phase 2: enable autosave only after hydration attempt
  useEffect(() => {
    if (!campaign?.id || !hydrationAttempted || isInitialized) return
    setIsInitialized(true)
  }, [campaign, hydrationAttempted, isInitialized])

  // Phase 3: fallback hydrate from server state API if nothing loaded yet
  useEffect(() => {
    if (!campaign?.id || !hydrationAttempted) return
    // If the user has interacted (removed/cleared/added) we should NOT rehydrate from server
    if (hasUserEdited) return
    if ((locationState.locations?.length ?? 0) > 0) return
    // Only attempt this once per mount/session
    if (fallbackAttempted) return

    let aborted = false
    ;(async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/state`)
        if (!res.ok) return

        const json = await res.json()
        const rawSaved = json?.state?.location_data as LocationState | null

        if (!aborted && rawSaved && (rawSaved.locations?.length ?? 0) > 0) {
          const normalized: LocationState = {
            locations: rawSaved.locations ?? [],
            status: (rawSaved.locations?.length ?? 0) > 0 ? "completed" : "idle",
            errorMessage: rawSaved.errorMessage,
          }
          logger.debug('LocationContext', '♻️ Fallback restored location state', normalized)
          setLocationState(normalized)
        }
      } catch {
        // ignore fetch errors in fallback path
      }
    })()

    setFallbackAttempted(true)
    return () => { aborted = true }
  }, [campaign?.id, hydrationAttempted, locationState.locations?.length, hasUserEdited, fallbackAttempted])

  // Save function
  const saveFn = useCallback(async (state: LocationState) => {
    if (!campaign?.id || !isInitialized) return
    await saveCampaignState('location_data', state as unknown as Record<string, unknown>)
  }, [campaign?.id, saveCampaignState, isInitialized])

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


