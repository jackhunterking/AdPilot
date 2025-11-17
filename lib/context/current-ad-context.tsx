/**
 * Feature: Current Ad Context
 * Purpose: Manage the currently active ad and load from normalized tables
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 *  - MASTER_PROJECT_ARCHITECTURE.md - Normalized schema
 */

"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { logger } from "@/lib/utils/logger"
import { useCampaignContext } from './campaign-context'

// Ad structure from database (normalized schema)
interface Ad {
  id: string
  campaign_id: string
  name: string
  status: 'draft' | 'published'
  // Deprecated: creative_data, copy_data, setup_snapshot (use normalized tables)
  selected_creative_id: string | null
  selected_copy_id: string | null
  meta_ad_id: string | null
  destination_type: string | null
  completed_steps?: unknown // JSONB array of completed step IDs from database
  created_at: string
  updated_at: string
}

// Setup snapshot structure - complete ad state
export interface SetupSnapshot {
  creative?: {
    imageUrl?: string
    imageVariations?: string[]
    baseImageUrl?: string
    selectedImageIndex?: number | null
    selectedCreativeVariation?: {
      gradient: string
      title: string
    } | null
  }
  copy?: {
    headline?: string
    body?: string
    primaryText?: string
    description?: string
    cta?: string
    variations?: Array<{
      headline: string
      body: string
      primaryText: string
      description: string
      cta: string
    }>
    selectedCopyIndex?: number | null
  }
  goal?: {
    selectedGoal?: string
    status?: string
    formData?: {
      id?: string
      name?: string
      type?: string
    } | null
  }
  location?: {
    locations?: Array<{
      id: string
      name: string
      coordinates: [number, number]
      radius?: number
      type: 'radius' | 'city' | 'region' | 'country'
      mode: 'include' | 'exclude'
    }>
    status?: string
  }
  destination?: {
    url?: string
    callToAction?: string
    status?: string
  }
  budget?: {
    dailyBudget?: number
    isConnected?: boolean
    status?: string
  }
}

interface CurrentAdContextType {
  currentAdId: string | null
  currentAd: Ad | null
  isLoading: boolean
  error: string | null
  hasUnsavedChanges: boolean
  markAsModified: () => void
  markAsSaved: () => void
  reloadAd: () => Promise<void>
  updateAdSnapshot: (snapshot: Partial<SetupSnapshot>) => Promise<void>
}

const CurrentAdContext = createContext<CurrentAdContextType | undefined>(undefined)

export function CurrentAdProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const { campaign } = useCampaignContext()
  const [currentAdId, setCurrentAdId] = useState<string | null>(null)
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Extract adId from URL
  useEffect(() => {
    const adId = searchParams.get('adId')
    setCurrentAdId(adId)
  }, [searchParams])

  // Load ad when adId changes
  const loadAd = useCallback(async (adId: string) => {
    if (!campaign?.id) return

    setIsLoading(true)
    setError(null)

    try {
      logger.debug('CurrentAdContext', `Loading ad ${adId} for campaign ${campaign.id}`)
      
      const response = await fetch(`/api/campaigns/${campaign.id}/ads/${adId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load ad: ${response.statusText}`)
      }

      const data = await response.json()
      
      logger.debug('CurrentAdContext', 'Ad loaded successfully', {
        adId: data.ad.id,
        selectedCreativeId: data.ad.selected_creative_id,
        selectedCopyId: data.ad.selected_copy_id
      })
      
      // Force new object reference to ensure React detects change
      setCurrentAd({...data.ad})
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ad'
      logger.error('CurrentAdContext', `Error loading ad: ${errorMessage}`)
      setError(errorMessage)
      setCurrentAd(null)
    } finally {
      setIsLoading(false)
    }
  }, [campaign?.id])

  // Load ad when currentAdId or campaign changes
  useEffect(() => {
    if (currentAdId && campaign?.id) {
      loadAd(currentAdId)
    } else {
      setCurrentAd(null)
      setError(null)
    }
  }, [currentAdId, campaign?.id, loadAd])

  // Reload current ad
  const reloadAd = useCallback(async () => {
    if (currentAdId) {
      await loadAd(currentAdId)
    }
  }, [currentAdId, loadAd])

  // Update ad snapshot (partial update with merge)
  const updateAdSnapshot = useCallback(async (snapshot: Partial<SetupSnapshot>) => {
    if (!currentAdId || !campaign?.id) {
      console.error('[updateAdSnapshot] Missing ad or campaign ID');
      logger.warn('CurrentAdContext', 'Cannot update snapshot: no current ad')
      return
    }

    console.log('[updateAdSnapshot] Writing to database:', {
      adId: currentAdId,
      campaignId: campaign.id,
      sections: Object.keys(snapshot),
      locationCount: snapshot.location?.locations?.length,
      locationData: snapshot.location
    });

    try {
      logger.debug('CurrentAdContext', 'Updating ad snapshot', {
        adId: currentAdId,
        sections: Object.keys(snapshot)
      })

      const response = await fetch(`/api/campaigns/${campaign.id}/ads/${currentAdId}/snapshot`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[updateAdSnapshot] HTTP error:', response.status, errorText);
        throw new Error(`Failed to update snapshot: ${response.statusText}`)
      }

      const data = await response.json()
      
      console.log('[updateAdSnapshot] ✅ Database write successful');
      console.log('[updateAdSnapshot] Saved location count:', data.setup_snapshot?.location?.locations?.length || 0);
      
      // Update local state with new snapshot
      setCurrentAd(prev => prev ? { ...prev, setup_snapshot: data.setup_snapshot } : null)
      
      // Clear unsaved changes flag after successful save
      setHasUnsavedChanges(false)
      
      logger.debug('CurrentAdContext', 'Snapshot updated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update snapshot'
      console.error('[updateAdSnapshot] ❌ Database write failed:', errorMessage, err);
      logger.error('CurrentAdContext', `Error updating snapshot: ${errorMessage}`)
      throw err
    }
  }, [currentAdId, campaign?.id])

  // Mark ad as modified (unsaved changes exist)
  const markAsModified = useCallback(() => {
    setHasUnsavedChanges(true)
    logger.debug('CurrentAdContext', 'Ad marked as modified', { currentAdId })
  }, [currentAdId])

  // Mark ad as saved (no unsaved changes)
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false)
    logger.debug('CurrentAdContext', 'Ad marked as saved', { currentAdId })
  }, [currentAdId])

  // Reset unsaved changes flag when ad changes
  useEffect(() => {
    setHasUnsavedChanges(false)
  }, [currentAdId])

  const value: CurrentAdContextType = {
    currentAdId,
    currentAd,
    isLoading,
    error,
    hasUnsavedChanges,
    markAsModified,
    markAsSaved,
    reloadAd,
    updateAdSnapshot
  }

  return (
    <CurrentAdContext.Provider value={value}>
      {children}
    </CurrentAdContext.Provider>
  )
}

export function useCurrentAd() {
  const context = useContext(CurrentAdContext)
  if (context === undefined) {
    throw new Error('useCurrentAd must be used within a CurrentAdProvider')
  }
  return context
}

