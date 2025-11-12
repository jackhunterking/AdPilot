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
 *  - audience: Demographics, interests
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
import { useAudience } from '@/lib/context/audience-machine-context'
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
  const { audienceState } = useAudience()
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
    audienceState: null as unknown as typeof audienceState,
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
    audienceState,
    goalState,
    budgetState,
    getSelectedCopy,
  }
  
  // Stable save function - ONLY depends on campaignId and adId
  const saveDraft = useCallback(async () => {
    if (!campaignId || !adId) return
    
    const contexts = contextsRef.current
    
    try {
      // Build snapshot from ref values
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
        audience: contexts.audienceState,
        goal: contexts.goalState,
        budget: contexts.budgetState,
      })
      
      // Create stable snapshot signature by omitting volatile fields
      const stableSnapshot = {
        creative: snapshot.creative,
        copy: snapshot.copy,
        destination: snapshot.destination,
        location: snapshot.location,
        audience: snapshot.audience,
        goal: snapshot.goal,
        budget: snapshot.budget,
      }
      
      // Check if anything changed by comparing stable fields only
      const currentSignature = JSON.stringify(stableSnapshot)
      if (currentSignature === lastSaveRef.current) {
        return
      }
      
      // Prepare ad data
      const selectedCopy = contexts.getSelectedCopy?.()
      const selectedImageUrl = contexts.selectedImageIndex !== null && contexts.adContent?.imageVariations?.[contexts.selectedImageIndex]
        ? contexts.adContent.imageVariations[contexts.selectedImageIndex]
        : contexts.adContent?.imageUrl || contexts.adContent?.imageVariations?.[0]
        
      const adData = {
        creative_data: {
          imageUrl: selectedImageUrl,
          imageVariations: contexts.adContent?.imageVariations,
          baseImageUrl: contexts.adContent?.baseImageUrl,
        },
        copy_data: {
          headline: selectedCopy?.headline || contexts.adContent?.headline,
          primaryText: selectedCopy?.primaryText || contexts.adContent?.body,
          description: selectedCopy?.description || contexts.adContent?.body,
          cta: contexts.adContent?.cta || 'Learn More',
        },
        setup_snapshot: snapshot,
      }
      
      // Save to server
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adData),
      })
      
      if (response.ok) {
        // ONLY update lastSaveRef on successful save to prevent re-save on failure
        lastSaveRef.current = currentSignature
      } else {
        console.error('[DraftAutoSave] Failed to save draft:', await response.text())
      }
    } catch (error) {
      console.error('[DraftAutoSave] Error saving draft:', error)
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

