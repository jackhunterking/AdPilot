/**
 * Feature: Draft Auto-Save Hook (Action-Triggered)
 * Purpose: Save draft progress immediately after user actions, not on timer
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
 */

import { useEffect, useRef, useCallback } from 'react'
import { useAdPreview } from '@/lib/context/ad-preview-context'
import { useAdCopy } from '@/lib/context/ad-copy-context'
import { useDestination } from '@/lib/context/destination-context'
import { useLocation } from '@/lib/context/location-context'
import { useGoal } from '@/lib/context/goal-context'
import { useBudget } from '@/lib/context/budget-context'
import { useCurrentAd } from '@/lib/context/current-ad-context'

export function useDraftAutoSave(
  campaignId: string | null,
  adId: string | null,
  enabled: boolean = true
) {
  const lastSaveRef = useRef<string>('')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { reloadAd } = useCurrentAd()
  
  // Get all context states
  const { adContent, selectedImageIndex, selectedCreativeVariation } = useAdPreview()
  const { adCopyState } = useAdCopy()
  const { destinationState } = useDestination()
  const { locationState } = useLocation()
  const { goalState } = useGoal()
  const { budgetState } = useBudget()
  
  // Store latest context values in refs
  const contextsRef = useRef({
    adContent: null as unknown as typeof adContent,
    selectedImageIndex: null as unknown as typeof selectedImageIndex,
    selectedCreativeVariation: null as unknown as typeof selectedCreativeVariation,
    adCopyState: null as unknown as typeof adCopyState,
    destinationState: null as unknown as typeof destinationState,
    locationState: null as unknown as typeof locationState,
    goalState: null as unknown as typeof goalState,
    budgetState: null as unknown as typeof budgetState,
  })
  
  // Update refs on every render
  contextsRef.current = {
    adContent,
    selectedImageIndex,
    selectedCreativeVariation,
    adCopyState,
    destinationState,
    locationState,
    goalState,
    budgetState,
  }
  
  // Stable save function with debouncing
  const triggerSave = useCallback(async (immediate: boolean = false) => {
    if (!enabled || !campaignId || !adId) return
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    const doSave = async () => {
      const contexts = contextsRef.current
      
      try {
        const sections: Record<string, unknown> = {}
        
        // Build sections (same logic as before)
        if (contexts.adContent?.imageVariations && contexts.adContent.imageVariations.length > 0) {
          sections.creative = {
            imageVariations: contexts.adContent.imageVariations,
            selectedImageIndex: contexts.selectedImageIndex ?? 0,
            format: 'feed'
          }
        }
        
        if (contexts.adCopyState.customCopyVariations && contexts.adCopyState.customCopyVariations.length > 0) {
          sections.copy = {
            variations: contexts.adCopyState.customCopyVariations.map((v) => ({
              headline: v.headline,
              primaryText: v.primaryText,
              description: v.description || '',
              cta: contexts.adContent?.cta || 'Learn More'
            })),
            selectedCopyIndex: contexts.adCopyState.selectedCopyIndex ?? 0
          }
        }
        
        if (contexts.destinationState.data?.type) {
          sections.destination = {
            type: contexts.destinationState.data.type,
            data: contexts.destinationState.data
          }
        }
        
        if (contexts.locationState.locations.length > 0) {
          sections.location = {
            locations: contexts.locationState.locations
          }
        }
        
        if (contexts.budgetState.dailyBudget && contexts.budgetState.dailyBudget > 0) {
          sections.budget = {
            dailyBudget: contexts.budgetState.dailyBudget,
            currency: contexts.budgetState.currency,
            startTime: contexts.budgetState.startTime,
            endTime: contexts.budgetState.endTime,
            timezone: contexts.budgetState.timezone
          }
        }
        
        if (Object.keys(sections).length === 0) {
          return // Nothing to save
        }
        
        const currentSignature = JSON.stringify(sections)
        if (currentSignature === lastSaveRef.current) {
          console.log('[DraftAutoSave] No changes detected, skipping save')
          return // No changes
        }
        
        console.log('[DraftAutoSave] Saving sections:', Object.keys(sections))
        
        const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}/snapshot`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sections),
        })
        
        if (response.ok) {
          lastSaveRef.current = currentSignature
          console.log('[DraftAutoSave] ✅ Saved successfully')
          
          // Reload currentAd to refresh completed_steps
          await reloadAd()
        } else {
          const errorText = await response.text()
          console.error('[DraftAutoSave] Failed:', response.status, errorText)
        }
      } catch (error) {
        console.error('[DraftAutoSave] Error:', error)
      }
    }
    
    if (immediate) {
      await doSave()
    } else {
      // Debounce: wait 300ms before saving
      saveTimeoutRef.current = setTimeout(() => {
        void doSave()
      }, 300)
    }
  }, [campaignId, adId, reloadAd, enabled])
  
  // Save on unmount (immediate, no debounce)
  useEffect(() => {
    return () => {
      void triggerSave(true)
    }
  }, [triggerSave])
  
  // Expose save function
  return { triggerSave }
}

