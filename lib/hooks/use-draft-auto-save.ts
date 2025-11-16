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

export function useDraftAutoSave(
  campaignId: string | null,
  adId: string | null,
  enabled: boolean = true
) {
  const lastSaveRef = useRef<string>('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
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
      // Build snapshot from ref values in DRAFT mode (lenient validation)
      const { buildAdSnapshot } = await import('@/lib/services/ad-snapshot-builder')
      const snapshot = buildAdSnapshot({
        adPreview: { 
          adContent: contexts.adContent, 
          selectedImageIndex: contexts.selectedImageIndex,
          selectedCreativeVariation: contexts.selectedCreativeVariation
        },
        adCopy: contexts.adCopyState,
        destination: contexts.destinationState,
        location: contexts.locationState,
        goal: contexts.goalState,
        budget: contexts.budgetState,
      }, { mode: 'draft' }) // Use draft mode for autosave - allows missing destination/goal
      
      // Debug logging: Track what fields are being saved
      console.log('[DraftAutoSave] Snapshot fields:', {
        hasCreative: !!snapshot.creative,
        hasCopy: !!snapshot.copy,
        hasDestination: !!snapshot.destination,
        hasGoal: !!snapshot.goal,
        hasLocation: snapshot.location.locations.length > 0,
        hasBudget: !!snapshot.budget,
      })
      
      // Create stable snapshot signature by omitting volatile fields
      const stableSnapshot = {
        creative: snapshot.creative,
        copy: snapshot.copy,
        destination: snapshot.destination,
        location: snapshot.location,
        goal: snapshot.goal,
        budget: snapshot.budget,
      }
      
      // Check if anything changed by comparing stable fields only
      const currentSignature = JSON.stringify(stableSnapshot)
      if (currentSignature === lastSaveRef.current) {
        return
      }
      
      // Prepare ad data for normalized schema (using /save endpoint)
      const selectedCopy = contexts.getSelectedCopy?.()
      const selectedImageIndex = contexts.selectedImageIndex ?? 0
      
      // Build payload for normalized save endpoint
      const savePayload = {
        copy: {
          variations: contexts.adCopyState.variations?.map(v => ({
            headline: v.headline,
            primaryText: v.primaryText,
            description: v.description || ''
          })) || [],
          selectedCopyIndex: contexts.adCopyState.selectedIndex ?? 0
        },
        creative: {
          imageVariations: contexts.adContent?.imageVariations || [],
          selectedImageIndex,
          format: 'feed'
        },
        destination: {
          type: contexts.destinationState.type || 'website',
          url: contexts.destinationState.data?.websiteUrl || contexts.destinationState.data?.url || null,
          phoneNumber: contexts.destinationState.data?.phoneNumber || null,
          normalizedPhone: contexts.destinationState.data?.phoneFormatted || null,
          cta: contexts.adContent?.cta || 'Learn More'
        }
      }
      
      // Save to server using normalized save endpoint
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      })
      
      if (response.ok) {
        // ONLY update lastSaveRef on successful save to prevent re-save on failure
        lastSaveRef.current = currentSignature
        console.log('[DraftAutoSave] ✅ Draft saved successfully')
      } else {
        console.error('[DraftAutoSave] Failed to save draft:', await response.text())
      }
    } catch (error) {
      // Since we're using draft mode, errors should be rare
      // Log them prominently for debugging
      console.error('[DraftAutoSave] ⚠️ Unexpected error saving draft:', {
        error: error instanceof Error ? error.message : String(error),
        campaignId,
        adId,
        contextStates: {
          hasAdContent: !!contexts.adContent,
          hasDestination: !!contexts.destinationState.data,
          hasGoal: !!contexts.goalState.selectedGoal,
        }
      })
    }
  }, [campaignId, adId]) // ONLY campaignId and adId - stable dependencies!
  
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

