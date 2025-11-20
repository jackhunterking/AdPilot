/**
 * Feature: Unified Ad Save Hook
 * Purpose: Single hook for saving ad data to normalized tables via snapshot API
 * References:
 *  - Supabase: https://supabase.com/docs
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

interface SaveAdOptions {
  campaignId: string
  adId: string
  adContent: {
    imageUrl?: string
    imageVariations?: string[]
    baseImageUrl?: string
    headline?: string
    body?: string
    cta?: string
  } | null
  selectedImageIndex: number | null
  adCopyState: {
    customCopyVariations?: Array<{
      id: string
      headline: string
      primaryText: string
      description: string
    }> | null
    selectedCopyIndex: number | null
  }
  destinationState: {
    data?: {
      type?: 'instant_form' | 'website_url' | 'phone_number' | null
      formId?: string
      formName?: string
      websiteUrl?: string
      displayLink?: string
      phoneNumber?: string
      phoneFormatted?: string
    } | null
  }
  locationState: {
    locations: Array<{
      name: string
      type: string
      coordinates?: [number, number]
      radius?: number
      mode?: string
      id?: string
    }>
  }
  budgetState: {
    dailyBudget: number
    currency: string
    startTime?: string | null
    endTime?: string | null
    timezone?: string | null
  }
  onSuccess?: () => void | Promise<void>
}

interface SaveAdResult {
  success: boolean
  snapshot?: unknown
  completedSteps?: string[]
  error?: string
}

export function useSaveAd() {
  const [isSaving, setIsSaving] = useState(false)
  
  const saveAd = useCallback(async (options: SaveAdOptions): Promise<SaveAdResult> => {
    const {
      campaignId,
      adId,
      adContent,
      selectedImageIndex,
      adCopyState,
      destinationState,
      locationState,
      budgetState
    } = options
    
    if (isSaving) {
      console.warn('[useSaveAd] Save already in progress')
      return { success: false, error: 'Save in progress' }
    }
    
    setIsSaving(true)
    
    try {
      // Build sections from context states
      const sections: Record<string, unknown> = {}
      
      // Creative section
      if (adContent?.imageVariations?.length) {
        sections.creative = {
          imageVariations: adContent.imageVariations,
          selectedImageIndex: selectedImageIndex ?? 0,
          format: 'feed'
        }
      }
      
      // Copy section
      const variations = adCopyState.customCopyVariations || []
      if (variations.length > 0) {
        sections.copy = {
          variations: variations.map(v => ({
            headline: v.headline,
            primaryText: v.primaryText,
            description: v.description || '',
            cta: adContent?.cta || 'Learn More'
          })),
          selectedCopyIndex: adCopyState.selectedCopyIndex ?? 0
        }
      }
      
      // Destination section
      if (destinationState.data?.type) {
        sections.destination = {
          type: destinationState.data.type,
          data: destinationState.data
        }
      }
      
      // Location section
      if (locationState.locations.length > 0) {
        sections.location = {
          locations: locationState.locations
        }
      }
      
      // Budget section
      if (budgetState.dailyBudget > 0) {
        sections.budget = {
          dailyBudget: budgetState.dailyBudget,
          currency: budgetState.currency,
          startTime: budgetState.startTime,
          endTime: budgetState.endTime,
          timezone: budgetState.timezone
        }
      }
      
      console.log('[useSaveAd] Saving ad to normalized tables:', {
        adId,
        campaignId,
        sections: Object.keys(sections)
      })
      
      // Save via v1 snapshot API (writes to normalized tables)
      const response = await fetch(
        `/api/v1/ads/${adId}/save`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sections)
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save ad')
      }
      
      const { setup_snapshot, completed_steps } = await response.json()
      
      console.log('[useSaveAd] ✅ Save successful', {
        adId,
        completedSteps: completed_steps
      })
      
      // Call success callback if provided (e.g., to reload currentAd)
      if (options.onSuccess) {
        await options.onSuccess()
      }
      
      return {
        success: true,
        snapshot: setup_snapshot,
        completedSteps: completed_steps
      }
      
    } catch (error) {
      console.error('[useSaveAd] ❌ Save failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      setIsSaving(false)
    }
  }, [isSaving])
  
  return { saveAd, isSaving }
}

