/**
 * Feature: Draft Auto-Save Hook
 * Purpose: Automatically save draft ad progress while user is building
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs
 * 
 * IMPORTANT: Snapshot Comparison Strategy
 * ========================================
 * To prevent infinite save loops, we MUST exclude volatile fields from comparison:
 * 
 * EXCLUDED FIELDS (change every time, don't compare):
 *  - createdAt: Timestamp generated on every buildAdSnapshot() call
 *  - wizardVersion: Static metadata, not user data
 *  - metaConnection: Optional, may change independently of ad config
 * 
 * INCLUDED FIELDS (only these trigger saves):
 *  - creative: Images, variations, selections
 *  - copy: Headlines, text, CTA
 *  - destination: Form/URL/phone config
 *  - location: Targeting locations
 *  - goal: Campaign objective
 *  - budget: Daily spend, schedule
 * 
 * When adding new fields to AdSetupSnapshot:
 *  1. If field is user-editable data → include in stableSnapshot
 *  2. If field is metadata/timestamp → exclude from stableSnapshot
 *  3. Document the decision in comments
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { reloadAd } = useCurrentAd()
  
  // Get all context states
  const { adContent, selectedImageIndex, selectedCreativeVariation } = useAdPreview()
  const { adCopyState, getSelectedCopy } = useAdCopy()
  const { destinationState } = useDestination()
  const { locationState } = useLocation()
  const { goalState } = useGoal()
  const { budgetState } = useBudget()
  
  // Store latest context values in refs (updated on every render, no deps)
  const contextsRef = useRef({
    adContent: null as unknown as typeof adContent,
    selectedImageIndex: null as unknown as typeof selectedImageIndex,
    selectedCreativeVariation: null as unknown as typeof selectedCreativeVariation,
    adCopyState: null as unknown as typeof adCopyState,
    destinationState: null as unknown as typeof destinationState,
    locationState: null as unknown as typeof locationState,
    goalState: null as unknown as typeof goalState,
    budgetState: null as unknown as typeof budgetState,
    getSelectedCopy: null as unknown as typeof getSelectedCopy,
  })
  
  // Update refs on every render (no deps, no loops)
  contextsRef.current = {
    adContent,
    selectedImageIndex,
    selectedCreativeVariation,
    adCopyState,
    destinationState,
    locationState,
    goalState,
    budgetState,
    getSelectedCopy,
  }
  
  // Stable save function - ONLY depends on campaignId and adId
  const saveDraft = useCallback(async () => {
    if (!campaignId || !adId) return
    
    const contexts = contextsRef.current
    
    try {
      const sections: Record<string, unknown> = {}
      
      // Only include sections with data
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
        return // No changes
      }
      
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}/snapshot`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sections),
      })
      
      if (response.ok) {
        lastSaveRef.current = currentSignature
        console.log('[DraftAutoSave] ✅ Saved')
        
        // Reload currentAd to refresh completed_steps for stepper checkmarks
        await reloadAd()
      } else {
        console.error('[DraftAutoSave] Failed:', await response.text())
      }
    } catch (error) {
      console.error('[DraftAutoSave] Error:', error)
    }
  }, [campaignId, adId, reloadAd]) // ONLY campaignId, adId, and reloadAd - stable dependencies!
  
  // Set up interval
  useEffect(() => {
    if (!enabled || !campaignId || !adId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    
    // Save immediately on mount (if data exists)
    void saveDraft()
    
    // Then save every 15 seconds
    intervalRef.current = setInterval(() => {
      void saveDraft()
    }, 15000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, campaignId, adId, saveDraft])
  
  // Save on unmount
  useEffect(() => {
    return () => {
      void saveDraft()
    }
  }, [saveDraft])
}

