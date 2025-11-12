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
import { useAudience } from '@/lib/context/audience-context'
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
  
  const saveDraft = useCallback(async () => {
    if (!campaignId || !adId) return
    
    try {
      // Build snapshot
      const { buildAdSnapshot } = await import('@/lib/services/ad-snapshot-builder')
      const snapshot = buildAdSnapshot({
        adPreview: { adContent, selectedImageIndex, selectedCreativeVariation },
        adCopy: adCopyState,
        destination: destinationState,
        location: locationState,
        audience: audienceState,
        goal: goalState,
        budget: budgetState,
      })
      
      // Create stable snapshot signature by omitting volatile fields
      // IMPORTANT: We exclude `createdAt` and `wizardVersion` because they change
      // on every snapshot creation, causing infinite loops. Only compare actual data.
      const stableSnapshot = {
        creative: snapshot.creative,
        copy: snapshot.copy,
        destination: snapshot.destination,
        location: snapshot.location,
        audience: snapshot.audience,
        goal: snapshot.goal,
        budget: snapshot.budget,
        // Explicitly exclude: createdAt, wizardVersion, metaConnection
      }
      
      // Check if anything changed by comparing stable fields only
      const currentSignature = JSON.stringify(stableSnapshot)
      if (currentSignature === lastSaveRef.current) {
        console.log('[DraftAutoSave] No changes detected, skipping save')
        return
      }
      
      // Prepare ad data
      const selectedCopy = getSelectedCopy()
      const selectedImageUrl = selectedImageIndex !== null && adContent?.imageVariations?.[selectedImageIndex]
        ? adContent.imageVariations[selectedImageIndex]
        : adContent?.imageUrl || adContent?.imageVariations?.[0]
        
      const adData = {
        creative_data: {
          imageUrl: selectedImageUrl,
          imageVariations: adContent?.imageVariations,
          baseImageUrl: adContent?.baseImageUrl,
        },
        copy_data: {
          headline: selectedCopy?.headline || adContent?.headline,
          primaryText: selectedCopy?.primaryText || adContent?.body,
          description: selectedCopy?.description || adContent?.body,
          cta: adContent?.cta || 'Learn More',
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
        console.log('[DraftAutoSave] Draft saved successfully at', new Date().toISOString())
      } else {
        console.error('[DraftAutoSave] Failed to save draft:', await response.text())
      }
    } catch (error) {
      console.error('[DraftAutoSave] Error saving draft:', error)
    }
  }, [
    campaignId,
    adId,
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
  ])
  
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

