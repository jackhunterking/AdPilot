/**
 * Feature: Launch Preview Panel
 * Purpose: Provide the prelaunch summary with edit entry points tied to each configuration section
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction#why-use-the-ai-sdk
 *  - AI Elements: https://ai-sdk.dev/elements#quick-start
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#key-features
 *  - Supabase: https://supabase.com/docs/guides/auth#providers
 */

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Play, ImageIcon, Video, Layers, Sparkles, Building2, Check, Facebook, Loader2, Edit2, Palette, Type, MapPin, Target, Rocket, Flag, Link2, MoreVertical, Globe, Heart, ThumbsUp, MessageCircle, Share2, ChevronDown, AlertTriangle, ChevronUp } from "lucide-react"
import { LocationSelectionCanvas } from "./location-selection-canvas"
import { AdCopySelectionCanvas } from "./ad-copy-selection-canvas"
import { DestinationSetupCanvas } from "./destination-setup-canvas"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { CampaignStepper } from "./campaign-stepper"
import { useBudget } from "@/lib/context/budget-context"
import { useLocation } from "@/lib/context/location-context"
import { useGoal } from "@/lib/context/goal-context"
import { useDestination } from "@/lib/context/destination-context"
import { useAdCopy } from "@/lib/context/ad-copy-context"
import { cn } from "@/lib/utils"
import { newEditSession } from "@/lib/utils/edit-session"
// Removed two-step Meta connect flow; using single summary card
import { MetaConnectCard } from "@/components/meta/MetaConnectCard"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useCurrentAd } from "@/lib/context/current-ad-context"
import type { Database } from "@/lib/supabase/database.types"
import { metaStorage } from "@/lib/meta/storage"
import { toast } from "sonner"
import { CollapsibleSection } from "@/components/launch/collapsible-section"
import { SectionEditModal } from "@/components/launch/section-edit-modal"
import { PublishBudgetCard } from "@/components/launch/publish-budget-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PublishFlowDialog } from "@/components/launch/publish-flow-dialog"
import { LaunchCampaignView } from "@/components/launch/launch-campaign-view"
import { logger } from "@/lib/utils/logger"
import { useSaveAd } from "@/lib/hooks/use-save-ad"

export function PreviewPanel() {
  const searchParams = useSearchParams()
  const isCreatingVariant = searchParams.get('variant') === 'true'
  
  // Detect if we're editing an existing ad
  const viewMode = searchParams.get('view')
  const currentAdId = searchParams.get('adId')
  const isEditingExistingAd = viewMode === 'edit' && !!currentAdId
  
  const [activeFormat, setActiveFormat] = useState("feed")
  // Removed regenerate feature: no regenerating state
  const { adContent, setAdContent, isPublished, setIsPublished, selectedImageIndex, selectedCreativeVariation, setSelectedCreativeVariation, setSelectedImageIndex } = useAdPreview()
  const { budgetState, isComplete, setDailyBudget } = useBudget()
  const { campaign } = useCampaignContext()
  const { currentAd, reloadAd } = useCurrentAd()
  const { locationState, addLocations } = useLocation()
  const { goalState } = useGoal()
  const { destinationState } = useDestination()
  const { adCopyState, getActiveVariations, getSelectedCopy } = useAdCopy()
  const [showReelMessage, setShowReelMessage] = useState(false)
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)
  const { saveAd, isSaving: isSavingHook } = useSaveAd()
  
  // Modal state management for section editing
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  
  // Publish flow dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  
  // Track current step
  const [currentStepId, setCurrentStepId] = useState<string>('ads')

  // Memoized Meta connection completion check - reacts to campaign state and budget state changes
  const isMetaConnectionComplete = useMemo(() => {
    // Note: campaign_states table removed - check budget state and localStorage
    
    // Check budget state
    const budgetConnected = budgetState.isConnected === true
    
    // Check localStorage as fallback (for immediate UI updates before server sync)
    let localStorageConnected = false
    if (campaign?.id && typeof window !== 'undefined') {
      try {
        const connectionData = metaStorage.getConnection(campaign.id)
        if (connectionData) {
          const summary = metaStorage.getConnectionSummary(campaign.id)
          localStorageConnected = Boolean(
            summary?.status === 'connected' || 
            summary?.status === 'selected_assets' ||
            (summary?.adAccount?.id && summary?.business?.id)
          )
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    
    return budgetConnected || localStorageConnected
  }, [campaign?.id, budgetState.isConnected])

  // Listen for step changes
  useEffect(() => {
    const handleStepChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ stepId?: string }>
      if (customEvent.detail.stepId) {
        setCurrentStepId(customEvent.detail.stepId)
      }
    }
    
    window.addEventListener('stepChanged', handleStepChanged)
    return () => window.removeEventListener('stepChanged', handleStepChanged)
  }, [])
  
  // Close modals when sections complete
  useEffect(() => {
    if (locationState.status === "completed" && locationModalOpen) {
      setLocationModalOpen(false)
    }
  }, [locationState.status, locationModalOpen])

  // Save current step when user clicks Next (Phase 1, Task 1.2)
  useEffect(() => {
    const handleSaveBeforeNext = async (event: Event) => {
      const customEvent = event as CustomEvent<{ stepId: string }>
      const stepId = customEvent.detail.stepId
      
      if (!campaign?.id || !currentAd?.id) {
        console.warn('[PreviewPanel] Cannot save - missing campaign or ad ID')
        return
      }
      
      console.log('[PreviewPanel] Saving step on Next click:', stepId, 'for ad:', currentAd.id)
      
      // Build payload based on which step was completed
      const sections: Record<string, unknown> = {}
      
      switch (stepId) {
        case 'ads':
          if (adContent?.imageVariations && selectedImageIndex !== null) {
            sections.creative = {
              imageVariations: adContent.imageVariations,
              selectedImageIndex,
              format: 'feed'
            }
          }
          break
          
        case 'copy':
          if (adCopyState.customCopyVariations && adCopyState.selectedCopyIndex !== null) {
            sections.copy = {
              variations: adCopyState.customCopyVariations.map(v => ({
                headline: v.headline,
                primaryText: v.primaryText,
                description: v.description || '',
                cta: adContent?.cta || 'Learn More'
              })),
              selectedCopyIndex: adCopyState.selectedCopyIndex
            }
          }
          break
          
        case 'location':
          if (locationState.locations.length > 0) {
            sections.location = {
              locations: locationState.locations
            }
          }
          break
          
        case 'destination':
          if (destinationState.data?.type) {
            sections.destination = {
              type: destinationState.data.type,
              data: destinationState.data
            }
          }
          break
      }
      
      if (Object.keys(sections).length === 0) {
        console.log('[PreviewPanel] No data to save for step:', stepId)
        return
      }
      
      // Save to database
      try {
        const response = await fetch(
          `/api/campaigns/${campaign.id}/ads/${currentAd.id}/snapshot`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sections)
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          console.log(`[PreviewPanel] ✅ Step "${stepId}" saved for ad ${currentAd.id}`, {
            completedSteps: data.completed_steps
          })
        } else {
          console.error('[PreviewPanel] Save failed:', await response.text())
        }
      } catch (error) {
        console.error('[PreviewPanel] Save error:', error)
        // Don't block navigation on save failure - data is in local state
      }
    }
    
    window.addEventListener('saveBeforeNext', handleSaveBeforeNext)
    return () => window.removeEventListener('saveBeforeNext', handleSaveBeforeNext)
  }, [campaign?.id, currentAd?.id, adContent, selectedImageIndex, adCopyState, locationState, destinationState])

  // Listen for image edit events from AI chat (always mounted)
  useEffect(() => {
    const handleImageEdited = (event: Event) => {
      const customEvent = event as CustomEvent<{ sessionId?: string; variationIndex: number; newImageUrl: string }>;
      const { sessionId, variationIndex, newImageUrl } = customEvent.detail;
      // Only accept tool-originated updates that carry a sessionId
      if (!sessionId) return;
      
      logger.debug('PreviewPanel', `Received imageEdited event for variation ${variationIndex}`, { newImageUrl });
      
      // Update ad content with new image URL using functional update to avoid stale closure
      setAdContent((prev) => {
        if (!prev?.imageVariations) {
          logger.warn('PreviewPanel', 'No imageVariations to update');
          return prev;
        }
        const updatedVariations = [...prev.imageVariations];
        updatedVariations[variationIndex] = newImageUrl;
        logger.debug('PreviewPanel', `✅ Updated variation ${variationIndex} with new image`);
        logger.debug('PreviewPanel', '📤 Auto-save will trigger (context change)');
        return {
          ...prev,
          imageVariations: updatedVariations,
        };
      });
    };
    
    window.addEventListener('imageEdited', handleImageEdited);
    
    return () => {
      window.removeEventListener('imageEdited', handleImageEdited);
    };
  }, [setAdContent]);
  
  // Listen for location updates from AI chat (matching imageEdited pattern)
  useEffect(() => {
    const handleLocationUpdated = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        sessionId?: string;
        locations: Array<{
          name: string;
          coordinates: [number, number];
          radius?: number;
          type: string;
          mode: string;
          bbox?: [number, number, number, number];
          geometry?: unknown;
          key?: string;
          country_code?: string;
        }>;
        mode: string;
      }>;
      
      const { sessionId, locations } = customEvent.detail;
      
      if (!sessionId || !locations) {
        logger.warn('PreviewPanel', 'Invalid locationUpdated event', { sessionId, locations });
        return;
      }
      
      logger.debug('PreviewPanel', '✅ Received locationUpdated event', {
        count: locations.length,
        names: locations.map(l => l.name)
      });
      
      // Transform new locations
      const locationsWithIds = locations.map(loc => ({
        id: `loc-${sessionId}-${Math.random().toString(36).substring(2, 9)}`,
        name: loc.name,
        coordinates: loc.coordinates,
        radius: loc.radius || 30,
        type: loc.type as "radius" | "city" | "region" | "country",
        mode: loc.mode as "include" | "exclude",
        bbox: loc.bbox,
        geometry: loc.geometry as { type: string; coordinates: number[] | number[][] | number[][][] | number[][][][] } | undefined,
        key: loc.key,
        country_code: loc.country_code
      }));
      
      // MERGE with existing locations (do merge HERE, not in context)
      const existingLocations = locationState.locations;
      const existingMap = new Map(
        existingLocations.map(loc => [`${loc.name}-${loc.mode}`, loc])
      );
      
      // Add new locations to map (deduplicates by name+mode)
      locationsWithIds.forEach(newLoc => {
        existingMap.set(`${newLoc.name}-${newLoc.mode}`, newLoc);
      });
      
      const mergedLocations = Array.from(existingMap.values());
      
      logger.debug('PreviewPanel', '🔀 Merged locations', {
        existing: existingLocations.length,
        new: locationsWithIds.length,
        merged: mergedLocations.length
      });
      
      // Update context with merged list (use replace mode to avoid double-merge)
      addLocations(mergedLocations, false);
      
      // IMMEDIATELY save ALL locations to database
      if (campaign?.id && currentAd?.id) {
        try {
          logger.debug('PreviewPanel', '💾 Saving ALL locations to database', {
            count: mergedLocations.length,
            names: mergedLocations.map(l => `${l.name} (${l.mode})`)
          });
          
          const response = await fetch(
            `/api/campaigns/${campaign.id}/ads/${currentAd.id}/snapshot`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: {
                  locations: mergedLocations  // ✅ ALL locations (existing + new)
                }
              })
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            logger.info('PreviewPanel', '✅ All locations saved to database', {
              count: mergedLocations.length,
              completedSteps: data.completed_steps
            });
            await reloadAd();
          } else {
            const errorText = await response.text();
            logger.error('PreviewPanel', '❌ Failed to save locations:', errorText);
            toast.error('Failed to save locations - please try again');
          }
        } catch (error) {
          logger.error('PreviewPanel', '❌ Error saving locations:', error);
          toast.error('Network error - locations not saved');
        }
      } else {
        logger.warn('PreviewPanel', '⚠️ Cannot save - missing campaign or ad ID');
      }
    };
    
    window.addEventListener('locationUpdated', handleLocationUpdated);
    
    return () => {
      window.removeEventListener('locationUpdated', handleLocationUpdated);
    };
  }, [addLocations, campaign?.id, currentAd?.id, reloadAd, locationState]);
  
  // Listen for location removal (save after delete)
  useEffect(() => {
    const handleLocationRemoved = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        locationId: string;
        remainingLocations: Array<{
          id: string;
          name: string;
          coordinates: [number, number];
          type: string;
          mode: string;
          radius?: number;
          bbox?: [number, number, number, number];
          geometry?: { type: string; coordinates: number[] | number[][] | number[][][] | number[][][][] };
          key?: string;
          country_code?: string;
        }>;
      }>;
      
      const { remainingLocations } = customEvent.detail;
      
      logger.debug('PreviewPanel', '🗑️ Location removed, saving remaining to DB', {
        count: remainingLocations.length
      });
      
      // Save remaining locations to database
      if (campaign?.id && currentAd?.id) {
        try {
          const response = await fetch(
            `/api/campaigns/${campaign.id}/ads/${currentAd.id}/snapshot`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: {
                  locations: remainingLocations  // Save what's left
                }
              })
            }
          );
          
          if (response.ok) {
            logger.info('PreviewPanel', '✅ Remaining locations saved after removal');
            await reloadAd();
          } else {
            toast.error('Failed to save after removal');
          }
        } catch (error) {
          logger.error('PreviewPanel', '❌ Error saving after removal:', error);
          toast.error('Network error - removal not saved');
        }
      }
    };
    
    window.addEventListener('locationRemoved', handleLocationRemoved);
    
    return () => {
      window.removeEventListener('locationRemoved', handleLocationRemoved);
    };
  }, [campaign?.id, currentAd?.id, reloadAd]);
  
  // Listen for clear all locations (save empty state)
  useEffect(() => {
    const handleLocationsCleared = async (event: Event) => {
      logger.debug('PreviewPanel', '🗑️ All locations cleared, saving to DB');
      
      if (campaign?.id && currentAd?.id) {
        try {
          const response = await fetch(
            `/api/campaigns/${campaign.id}/ads/${currentAd.id}/snapshot`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: {
                  locations: []  // Empty array = delete all from DB
                }
              })
            }
          );
          
          if (response.ok) {
            logger.info('PreviewPanel', '✅ All locations cleared from database');
            await reloadAd();
          } else {
            toast.error('Failed to clear locations');
          }
        } catch (error) {
          logger.error('PreviewPanel', '❌ Error clearing locations:', error);
        }
      }
    };
    
    window.addEventListener('locationsCleared', handleLocationsCleared);
    
    return () => {
      window.removeEventListener('locationsCleared', handleLocationsCleared);
    };
  }, [campaign?.id, currentAd?.id, reloadAd]);
  
  const previewFormats = [
    { id: "feed", label: "Feed", icon: ImageIcon },
    { id: "story", label: "Story", icon: Layers },
    { id: "reel", label: "Reel", icon: Video },
  ]

  const handleReelClick = () => {
    setShowReelMessage(true)
    setTimeout(() => setShowReelMessage(false), 2500)
  }

  // Derive active ad copy variations for preview rendering
  const activeCopyVariations = getActiveVariations()

  useEffect(() => {
    if (!campaign?.id) {
      setHasPaymentMethod(false)
      return
    }

    if (typeof window === "undefined") {
      return
    }

    try {
      const summary = metaStorage.getConnectionSummary(campaign.id)
      const connection = metaStorage.getConnection(campaign.id)

      if (summary?.paymentConnected || connection?.ad_account_payment_connected) {
        setHasPaymentMethod(true)
        return
      }

      const adAccountId =
        summary?.adAccount?.id ??
        connection?.selected_ad_account_id ??
        budgetState.selectedAdAccount

      if (!adAccountId) {
        setHasPaymentMethod(false)
        return
      }

      let cancelled = false

      const verifyFunding = async () => {
        try {
          const res = await fetch(
            `/api/meta/payments/capability?campaignId=${encodeURIComponent(campaign.id)}`,
            { cache: "no-store" },
          )

          if (!res.ok) {
            return
          }

          const data: unknown = await res.json()
          const hasFunding = Boolean((data as { hasFunding?: unknown }).hasFunding)

          if (cancelled) return

          if (hasFunding) {
            metaStorage.markPaymentConnected(campaign.id)
            setHasPaymentMethod(true)
          } else {
            setHasPaymentMethod(false)
          }
        } catch (error) {
          if (!cancelled) {
            console.error("[PreviewPanel] Failed to verify payment capability", error)
            setHasPaymentMethod(false)
          }
        }
      }

      void verifyFunding()

      return () => {
        cancelled = true
      }
    } catch (error) {
      console.error("[PreviewPanel] Payment verification error", error)
    }
  }, [campaign?.id, budgetState.selectedAdAccount])

  // Check if all steps are complete (using local state for immediate response)
  const allStepsComplete = 
    selectedImageIndex !== null &&
    adCopyState.selectedCopyIndex !== null &&
    destinationState.status === "completed" &&
    locationState.locations.length > 0 &&
    isMetaConnectionComplete &&
    hasPaymentMethod &&
    isComplete()

  /**
   * Handles save draft action - saves ad without publishing
   */
  const handleSaveDraft = useCallback(async () => {
    if (!campaign?.id || !currentAdId || isSavingHook) return
    
    try {
      logger.info('PreviewPanel', 'Saving draft to normalized tables')
      
      const result = await saveAd({
        campaignId: campaign.id,
        adId: currentAdId,
        adContent,
        selectedImageIndex,
        adCopyState,
        destinationState,
        locationState,
        budgetState,
        onSuccess: () => reloadAd()
      })
      
      if (result.success) {
        toast.success('Draft saved successfully!')
        logger.info('PreviewPanel', '✅ Draft saved successfully')
      } else {
        throw new Error(result.error || 'Failed to save draft')
      }
    } catch (error) {
      logger.error('PreviewPanel', 'Error saving draft', error)
      toast.error('Failed to save draft')
    }
  }, [campaign?.id, currentAdId, isSavingHook, saveAd, adContent, selectedImageIndex, adCopyState, destinationState, locationState, budgetState])
  
  /**
   * Handles ad publish action - opens confirmation dialog
   */
  const handlePublish = useCallback(async () => {
    if (!campaign?.id) return
    if (!allStepsComplete) return
    if (isPublishing) return // Prevent double-click
    
    // Open the publish flow dialog in confirmation phase
    setPublishDialogOpen(true)
  }, [campaign?.id, allStepsComplete, isPublishing])
  
  const handlePublishComplete = async () => {
    if (!campaign?.id || !currentAdId) {
      throw new Error('Missing campaign or ad ID')
    }
    
    setIsPublishing(true)
    
    try {
      logger.info('PreviewPanel', '📦 Step 1: Saving ad to normalized tables...')
      
      // Step 1: Save the ad data using unified save hook
      const saveResult = await saveAd({
        campaignId: campaign.id,
        adId: currentAdId,
        adContent,
        selectedImageIndex,
        adCopyState,
        destinationState,
        locationState,
        budgetState,
        onSuccess: () => reloadAd()
      })
      
      if (!saveResult.success) {
        logger.error('PreviewPanel', 'Failed to save ad', saveResult.error)
        throw new Error(saveResult.error || 'Failed to save ad data')
      }
      
      logger.info('PreviewPanel', `✅ Step 1 complete: Ad saved to normalized tables`)
      
      // Step 2: Publish the ad
      logger.info('PreviewPanel', '📦 Step 2: Publishing ad to Meta...')
      
      const publishResponse = await fetch(`/api/campaigns/${campaign.id}/ads/${currentAdId}/publish`, {
        method: 'POST',
      })
      
      if (!publishResponse.ok) {
        const errorData = await publishResponse.json()
        logger.error('PreviewPanel', 'Failed to publish ad', errorData)
        throw new Error(errorData.error || 'Failed to publish ad')
      }
      
      const publishResult = await publishResponse.json()
      logger.info('PreviewPanel', `✅ Step 2 complete: Ad published (status: ${publishResult.status})`)
      
      // Mark as published in context
      setIsPublished(true)
      
      // Dispatch custom event to notify campaign workspace
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campaign:publish-complete', {
          detail: {
            campaignId: campaign.id,
            campaignName: campaign.name,
            adId: currentAdId,
            published: true,
            timestamp: Date.now()
          }
        }))
      }
    } catch (error) {
      logger.error('PreviewPanel', 'Error in handlePublishComplete', error)
      
      // Try to provide user-friendly error message
      if (error instanceof Response) {
        const errorData = await error.json().catch(() => ({}))
        const userMessage = errorData?.error?.userMessage || errorData?.error?.message || errorData?.error || 'Failed to publish ad'
        throw new Error(userMessage)
      } else if (error instanceof Error) {
        throw error
      } else {
        throw new Error('Failed to publish ad. Please try again.')
      }
    } finally {
      setIsPublishing(false)
    }
  }
  
  const handlePublishDialogClose = (open: boolean) => {
    setPublishDialogOpen(open)
    if (!open && !isPublished) {
      // User closed dialog before completion
      setIsPublishing(false)
    }
  }
  
  // Listen for save draft and publish requests from header
  useEffect(() => {
    const handleSaveDraftRequest = () => {
      void handleSaveDraft()
    }
    
    const handlePublishRequest = () => {
      void handlePublish()
    }
    
    window.addEventListener('saveDraftRequested', handleSaveDraftRequest)
    window.addEventListener('publishRequested', handlePublishRequest)
    
    return () => {
      window.removeEventListener('saveDraftRequested', handleSaveDraftRequest)
      window.removeEventListener('publishRequested', handlePublishRequest)
    }
  }, [handleSaveDraft, handlePublish])

  const handleSelectAd = async (index: number) => {
    // Toggle selection against persisted selectedImageIndex
    if (selectedImageIndex === index) {
      setSelectedCreativeVariation(null)
      setSelectedImageIndex(null)
      return
    }
    const variation = adVariations[index]
    if (!variation) return
    
    // Update local state first (immediate UI feedback)
    setSelectedCreativeVariation(variation)
    setSelectedImageIndex(index)
    
    // Save to backend immediately (don't wait for auto-save)
    if (campaign?.id && currentAd?.id) {
      try {
        const response = await fetch(
          `/api/campaigns/${campaign.id}/ads/${currentAd.id}/snapshot`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creative: {
                imageVariations: adContent?.imageVariations || [],
                selectedImageIndex: index,
                format: 'feed'
              }
            })
          }
        )

        if (!response.ok) {
          console.error('[Creative] Failed to save selection:', await response.text())
          toast.error('Failed to save creative selection')
          return
        }

        const data = await response.json()
        console.log('[Creative] ✅ Saved selection immediately', {
          selectedIndex: index,
          completedSteps: data.completed_steps
        })
        
        // Reload ad to update currentAd.completed_steps from backend
        console.log('[Creative] Calling reloadAd()...', { currentAdId: currentAd?.id })
        try {
          await reloadAd()
          console.log('[Creative] ✅ reloadAd() completed successfully')
        } catch (error) {
          console.error('[Creative] ❌ reloadAd() failed:', error)
        }
      } catch (error) {
        console.error('[Creative] Error saving selection:', error)
        toast.error('Network error - selection not saved')
      }
    }
  }

  const handleEditAd = (index: number) => {
    // Send variation to AI chat for editing with rich visual reference
    const variation = adVariations[index]
    if (!variation) return
    const currentFormat = activeFormat
    
    // Get the actual generated image for this variation if it exists
    const variationImageUrl = adContent?.imageVariations?.[index]
    
    // Create reference context for the AI chat to render
    const editSession = newEditSession({
      variationIndex: index,
      imageUrl: variationImageUrl,
    })

    const referenceContext = {
      type: 'ad_variation_reference',
      action: 'edit',
      variationIndex: index,
      variationTitle: variation.title,
      format: currentFormat,
      gradient: variation.gradient,
      imageUrl: variationImageUrl, // Use the specific variation's image
      editSession,
      
      // Ad copy content for the reference card
      content: {
        primaryText: adContent?.body,
        headline: adContent?.headline,
        description: adContent?.body,
      },
      
      // Visual preview data
      preview: {
        format: currentFormat,
        gradient: variation.gradient,
        title: variation.title,
        imageUrl: variationImageUrl, // Include in preview as well
        brandName: 'Your Brand',
        headline: adContent?.headline,
        body: adContent?.body,
        dimensions: currentFormat === 'story' 
          ? { width: 360, height: 640, aspect: '9:16' }
          : { width: 500, height: 500, aspect: '1:1' }
      },
      
    // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        editMode: true,
        selectedFormat: currentFormat,
        showSkeleton: true  // Creative step should show skeleton placeholders
      }
    }
    
    // Only dispatch one event to show reference and enable edit mode
    // Do NOT send a message automatically
    window.dispatchEvent(new CustomEvent('openEditInChat', { 
      detail: referenceContext
    }))
  }

  // Removed regenerate handler

  // Mock ad variations with different gradients
  const adVariations = [
    { gradient: "from-blue-600 via-blue-500 to-cyan-500", title: "Variation 1" },
    { gradient: "from-purple-600 via-purple-500 to-pink-500", title: "Variation 2" },
    { gradient: "from-green-600 via-green-500 to-emerald-500", title: "Variation 3" },
  ]

  // Render single Feed ad mockup (Facebook pixel-perfect format)
  const renderFeedAd = (variation: typeof adVariations[0], index: number) => {
    const isSelected = selectedImageIndex === index
    const isProcessing = false
    // Use canonical copy source - single source of truth
    const copyForCard = getSelectedCopy()
    // Determine if we should show skeleton (creative step) or actual text (copy step)
    const showSkeleton = currentStepId === 'ads'
    
    return (
      <div key={index} className="space-y-2">
        <div 
          className={cn(
            "rounded-lg border-2 bg-white overflow-hidden hover:shadow-lg transition-all relative cursor-pointer",
            isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[#CED0D4]',
            isProcessing && 'opacity-75'
          )}
          style={{ borderRadius: '8px' }}
          onClick={() => handleSelectAd(index)}
        >
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
              <div className="bg-card/95 rounded-xl px-4 py-3 shadow-2xl border border-border/50 flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium">
                  Regenerating...
                </span>
              </div>
            </div>
          )}

          {/* Selection Indicator - Always visible when selected */}
          {isSelected && !isProcessing && (
            <div className="absolute top-2 right-2 z-20 bg-blue-500 text-white rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          )}

          {/* Header Section - Facebook Style */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#CED0D4]" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px' }}>
          {/* Profile Picture - 40px circle, solid blue */}
          <div className="h-10 w-10 rounded-full bg-[#1877F2] flex-shrink-0" style={{ width: '40px', height: '40px' }} />
          
          {/* Business Name & Sponsored */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-[#050505]" style={{ fontSize: '15px', fontWeight: 600 }}>Business Name</p>
            <div className="flex items-center gap-1">
              <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>Sponsored</p>
              <Globe className="h-3 w-3 text-[#65676B]" style={{ width: '12px', height: '12px' }} />
            </div>
          </div>
          
          {/* Options Icon - MoreVertical on right */}
          <MoreVertical className="h-5 w-5 text-[#65676B] flex-shrink-0 cursor-pointer hover:bg-[#F2F3F5] rounded-full p-1" style={{ width: '20px', height: '20px' }} />
        </div>

        {/* Primary Text Section - BEFORE Media */}
        <div className="px-3 pt-2 pb-3" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '12px' }}>
          {showSkeleton ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <p className="text-[#050505] leading-[1.3333]" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '20px' }}>
              {copyForCard.primaryText}
            </p>
          )}
        </div>

        {/* Media Section - Square (1:1) aspect ratio - 1080x1080 */}
        {adContent?.imageVariations?.[index] ? (
          <div className="relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
            <img
              src={adContent.imageVariations[index]}
              alt={adContent.headline}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`relative overflow-hidden bg-[#1C1E21]`} style={{ aspectRatio: '1/1' }} />
        )}

        {/* Link Preview Section - Horizontal Layout */}
        <div className="flex items-start gap-3 px-3 py-3 border-b border-[#CED0D4]" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
          {/* Left Side - Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Website URL */}
            <p className="text-[#65676B] uppercase tracking-wide" style={{ fontSize: '11px', fontWeight: 400, letterSpacing: '0.5px' }}>
              YOURWEBSITE.HELLO
            </p>
            {/* Headline */}
            {showSkeleton ? (
              <Skeleton className="h-5 w-4/5" />
            ) : (
              <p className="font-bold text-[#050505] line-clamp-1" style={{ fontSize: '17px', fontWeight: 700, lineHeight: '1.1765' }}>
                {copyForCard.headline}
              </p>
            )}
            {/* Description */}
            {showSkeleton ? (
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-[#050505] line-clamp-2" style={{ fontSize: '15px', fontWeight: 400, lineHeight: '1.3333' }}>
                {copyForCard.description}
              </p>
            )}
          </div>
          
          {/* Right Side - Learn more Button */}
          <button 
            className="flex-shrink-0 bg-[#E4E6EB] text-[#050505] font-semibold rounded-md px-3 py-2 hover:bg-[#D8DADF] transition-colors"
            style={{ 
              fontSize: '15px', 
              fontWeight: 600, 
              paddingLeft: '12px', 
              paddingRight: '12px', 
              paddingTop: '8px', 
              paddingBottom: '8px',
              borderRadius: '6px',
              minWidth: '100px'
            }}
            disabled
          >
            Learn more
          </button>
        </div>

        {/* Engagement Section */}
        <div>
          {/* Top Row - Reactions & Counts */}
          <div className="flex items-center justify-between px-2 py-1" style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px' }}>
            {/* Left Side - Reactions */}
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-4 w-4 text-[#1877F2]" style={{ width: '16px', height: '16px' }} />
              <p className="text-[#050505]" style={{ fontSize: '13px', fontWeight: 400 }}>Oliver, Sofia and 28 others</p>
            </div>
            
            {/* Right Side - Comments & Shares */}
            <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>14 Comments 7 Shares</p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center border-t border-[#CED0D4]" style={{ borderTopWidth: '1px' }}>
            {/* Like Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <ThumbsUp className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Like</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#CED0D4]" style={{ width: '1px' }} />
            
            {/* Comment Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <MessageCircle className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Comment</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#CED0D4]" style={{ width: '1px' }} />
            
            {/* Share Button */}
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <Share2 className="h-5 w-5 text-[#65676B]" style={{ width: '20px', height: '20px' }} />
              <span className="text-[#65676B]" style={{ fontSize: '15px', fontWeight: 400 }}>Share</span>
            </button>
            
            {/* Dropdown Arrow */}
            <button className="px-2 py-2 hover:bg-[#F2F3F5] transition-colors">
              <ChevronDown className="h-4 w-4 text-[#65676B]" style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
        </div>
        
        {/* Edit and Select Buttons - Below Card */}
        <div className="flex items-center gap-2 justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleEditAd(index)
            }}
            className="text-xs h-8 px-3 font-medium"
          >
            <Edit2 className="h-3 w-3 mr-1.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            onClick={(e) => {
              e.stopPropagation()
              handleSelectAd(index)
            }}
            className="text-xs h-8 px-3 font-medium"
          >
            {isSelected ? (
              <>
                <Check className="h-3 w-3 mr-1.5" />
                Selected
              </>
            ) : (
              'Select'
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Render single Story ad mockup (Meta pixel-perfect format)
  const renderStoryAd = (variation: typeof adVariations[0], index: number) => {
    const isSelected = selectedImageIndex === index
    const isProcessing = false
    // Use canonical copy source - single source of truth
    const copyForCard = getSelectedCopy()
    // Determine if we should show skeleton (creative step) or actual text (copy step)
    const showSkeleton = currentStepId === 'ads'
    
    return (
      <div key={index} className="space-y-2">
        <div 
          className={cn(
            "aspect-[9/16] rounded-lg border-2 bg-white overflow-hidden hover:shadow-lg transition-all relative cursor-pointer",
            isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[#CED0D4]',
            isProcessing && 'opacity-75'
          )}
          style={{ borderRadius: '8px' }}
          onClick={() => handleSelectAd(index)}
        >
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-30 flex items-center justify-center">
              <div className="bg-card/95 rounded-xl px-4 py-3 shadow-2xl border border-border/50 flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-xs font-medium text-center">
                  Regenerating...
                </span>
              </div>
            </div>
          )}

          {/* Selection Indicator - Always visible when selected */}
          {isSelected && !isProcessing && (
            <div className="absolute top-2 right-2 z-30 bg-blue-500 text-white rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          )}

          {/* Progress Bar - Top Edge */}
        <div className="absolute top-0 left-0 right-0 z-30" style={{ height: '2px' }}>
          <div className="h-full bg-[#CED0D4]">
            <div className="h-full bg-white" style={{ width: '33%' }} />
          </div>
        </div>

        {/* Header Section - Subtle Gray Bar */}
        <div className="relative z-20 bg-[#F2F3F5] px-3 py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px' }}>
          <div className="flex items-center gap-2">
            {/* Brand Logo - 40x40px */}
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0" style={{ width: '40px', height: '40px', borderRadius: '8px' }}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
            </div>
            
            {/* Brand Name & Sponsored */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-[#333333]" style={{ fontSize: '15px', fontWeight: 600 }}>Business Name</p>
              <p className="text-[#65676B]" style={{ fontSize: '13px', fontWeight: 400 }}>Sponsored</p>
            </div>
            
            {/* Options Icon */}
            <MoreVertical className="h-5 w-5 text-[#65676B] flex-shrink-0 cursor-pointer" style={{ width: '20px', height: '20px' }} />
          </div>
        </div>

        {/* Main Creative Section - Full Screen Background */}
        <div className="absolute inset-0" style={{ top: '60px' }}>
          {adContent?.imageVariations?.[index] ? (
            <div className="relative w-full h-full">
              <img 
                src={adContent.imageVariations[index]} 
                alt={adContent.headline} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className={`relative w-full h-full bg-gradient-to-br ${variation.gradient}`} />
          )}
        </div>

        {/* Bottom Ad Copy/Engagement Section - Dark Background */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#242526]">
          {/* Information Text - Conditional Skeleton or Actual Copy */}
          <div className="px-3 pt-3 pb-2" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '12px', paddingBottom: '8px' }}>
            {showSkeleton ? (
              <div className="space-y-1">
                {/* Primary Text Skeleton */}
                <Skeleton className="h-3.5 w-full bg-white/30" style={{ height: '14px' }} />
                {/* Description Skeleton */}
                <Skeleton className="h-3.5 w-3/4 bg-white/30" style={{ height: '14px' }} />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-white text-sm" style={{ fontSize: '14px', fontWeight: 400 }}>
                  {copyForCard.primaryText}
                </p>
              </div>
            )}
          </div>
          
          {/* Expand Icon - ChevronUp */}
          <div className="flex justify-center py-1">
            <ChevronUp className="h-4 w-4 text-white" style={{ width: '16px', height: '16px' }} />
          </div>
          
          {/* Secondary CTA Button */}
          <div className="flex justify-center px-3 pb-3" style={{ paddingLeft: '12px', paddingRight: '12px', paddingBottom: '12px' }}>
            <button 
              className="bg-white text-[#333333] font-semibold rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
              style={{ 
                fontSize: '15px', 
                fontWeight: 600, 
                paddingLeft: '12px', 
                paddingRight: '12px', 
                paddingTop: '8px', 
                paddingBottom: '8px',
                borderRadius: '8px'
              }}
              disabled
            >
              Learn more
            </button>
          </div>
        </div>
        </div>
        
        {/* Edit and Select Buttons - Below Card */}
        <div className="flex items-center gap-2 justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleEditAd(index)
            }}
            className="text-xs h-8 px-3 font-medium"
          >
            <Edit2 className="h-3 w-3 mr-1.5" />
            Edit
          </Button>
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            onClick={(e) => {
              e.stopPropagation()
              handleSelectAd(index)
            }}
            className="text-xs h-8 px-3 font-medium"
          >
            {isSelected ? (
              <>
                <Check className="h-3 w-3 mr-1.5" />
                Selected
              </>
            ) : (
              'Select'
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Helper to check if we're waiting for creative generation
  const isWaitingForCreative = !adContent?.imageVariations || adContent.imageVariations.length === 0

  // Loading card for creative generation
  const renderLoadingCard = (index: number) => (
    <div
      key={`loading-${index}`}
      className="rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden relative"
      style={{ aspectRatio: activeFormat === "story" ? "9/16" : "1/1" }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-medium text-foreground">Waiting for creative generation...</p>
        <p className="text-xs text-muted-foreground mt-1">AI is creating your ad creative</p>
      </div>
    </div>
  )

  // Step 1: Ads Content with 3x2 Grid
  const adsContent = (
    <div className="space-y-6">
      <div className="flex justify-center pb-4">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          {previewFormats.map((format) => {
            const Icon = format.icon
            const isActive = activeFormat === format.id

            if (format.id === "reel") {
              return (
                <div key={format.id} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReelClick}
                    className="px-4 relative"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {format.label}
                    <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
                  </Button>
                  {showReelMessage && (
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="bg-popover border border-border rounded-md px-3 py-1.5 shadow-md">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Sparkles size={12} className="text-yellow-500" />
                          <span className="font-medium">Coming Soon!</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Button
                key={format.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFormat(format.id)}
                className="px-4"
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {format.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* 3x2 Grid of Ad Mockups or Loading Cards */}
      <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
        {isWaitingForCreative ? (
          // Show loading cards while waiting for creative generation
          <>
            {renderLoadingCard(0)}
            {renderLoadingCard(1)}
            {renderLoadingCard(2)}
          </>
        ) : (
          // Show actual ad variations once generated
          <>
            {activeFormat === "feed" && adVariations.map((variation, index) => renderFeedAd(variation, index))}
            {activeFormat === "story" && adVariations.map((variation, index) => renderStoryAd(variation, index))}
          </>
        )}
      </div>

      {/* Info Section */}
      {!isWaitingForCreative && !adContent?.imageVariations && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">Click any ad to select it, or hover to edit</p>
        </div>
      )}
    </div>
  )

  // Summary content generators for each section
  const metaSummaryContent = (
    <div className="p-2">
      <div className="max-w-3xl mx-auto">
        <MetaConnectCard />
      </div>
    </div>
  )

  const locationSummaryContent = (
    <LocationSelectionCanvas variant="summary" />
  )

  // Launch Content - New minimal UX for final step
  const launchContent = useMemo(() => {
    // Get selected copy for display
    const selectedCopy = getSelectedCopy()
    
    // Get selected image URL
    const selectedImageUrl = selectedImageIndex !== null && adContent?.imageVariations?.[selectedImageIndex]
      ? adContent.imageVariations[selectedImageIndex]
      : adContent?.imageUrl || adContent?.imageVariations?.[0]
    
    return (
      <LaunchCampaignView
        imageUrl={selectedImageUrl}
        brandName={campaign?.name || "Business Name"}
        primaryText={selectedCopy?.primaryText || adContent?.body}
        headline={selectedCopy?.headline || adContent?.headline}
        description={selectedCopy?.description || adContent?.body}
        ctaText={adContent?.cta || "Learn More"}
      />
    )
  }, [
    selectedImageIndex,
    adContent,
    campaign?.name,
    getSelectedCopy,
  ])

  // OLD launchContent (keeping for reference, can be removed)
  const OLD_launchContent = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">
      {/* Left: Full ad mockup using selected variation */}
      <div className="self-start lg:sticky lg:top-4 lg:-mt-4">
        <Card className="lg:w-[400px] xl:w-[420px]">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Ad Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Format selector (matches creator) */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border border-border p-1 bg-card">
              {previewFormats.map((format) => {
                const Icon = format.icon
                const isActive = activeFormat === format.id

                if (format.id === "reel") {
                  return (
                    <div key={format.id} className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReelClick}
                        className="px-4 relative"
                      >
                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                        {format.label}
                        <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
                      </Button>
                      {showReelMessage && (
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="bg-popover border border-border rounded-md px-3 py-1.5 shadow-md">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Sparkles size={12} className="text-yellow-500" />
                              <span className="font-medium">Coming Soon!</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Button
                    key={format.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveFormat(format.id)}
                    className="px-4"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {format.label}
                  </Button>
                )
              })}
            </div>
            </div>

            <div>
              {activeFormat === "story"
                ? adVariations.map((v, i) => selectedImageIndex === i && renderStoryAd(v, i))
                : adVariations.map((v, i) => selectedImageIndex === i && renderFeedAd(v, i))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-t pt-4">
            <div className="grid w-full gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'ads' } }))}
                className="h-8 px-3 justify-center"
              >
                <Palette className="h-4 w-4 mr-2" />
                Edit Ad Creative
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'copy' } }))}
                className="h-8 px-3 justify-center"
              >
                <Type className="h-4 w-4 mr-2" />
                Edit Ad Copy
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Right: Collapsible sections with modals */}
      <div className="flex flex-col gap-6 max-w-3xl mx-auto lg:w-full">
        {/* Publish Requirements Card */}
        <div>
          <PublishBudgetCard
            allStepsComplete={allStepsComplete}
            isPublished={isPublished}
          />
        </div>

        {/* Meta Connect Section */}
        <CollapsibleSection
          title="Connect Facebook & Instagram"
          icon={Link2}
          isComplete={isMetaConnectionComplete}
          summaryContent={metaSummaryContent}
          editStepId="meta-connect"
          onEdit={() => {}}
        />

        {/* Location Section */}
        <CollapsibleSection
          title="Target Locations"
          icon={MapPin}
          isComplete={locationState.status === "completed"}
          summaryContent={locationSummaryContent}
          editStepId="location"
          onEdit={() => setLocationModalOpen(true)}
        />

        {/* Edit Modals */}
        <SectionEditModal
          open={locationModalOpen}
          onOpenChange={setLocationModalOpen}
          title="Target Locations"
          size="full"
          className="max-w-6xl"
          bodyClassName="bg-muted/20 px-0 py-0"
          innerClassName="max-w-none mx-0 h-full"
        >
          <LocationSelectionCanvas />
        </SectionEditModal>
      </div>
    </div>
  )

  // Simple step definitions (no useMemo - always fresh, always correct)
  const steps = [
    {
      id: "ads",
      number: 1,
      title: "Ad Creative",
      description: "Select your ad creative design",
      completed: selectedImageIndex !== null,  // Local state - enables Next button instantly
      content: adsContent,
      icon: Palette,
    },
    {
      id: "copy",
      number: 2,
      title: "Ad Copy",
      description: "Choose your ad copy with headline and description",
      completed: adCopyState.selectedCopyIndex !== null,  // Local state - instant
      content: <AdCopySelectionCanvas />,
      icon: Type,
    },
    {
      id: "location",
      number: 3,
      title: "Target Location",
      description: "Choose where you want your ads to be shown",
      completed: locationState.locations.length > 0,  // Local state - instant
      content: <LocationSelectionCanvas />,
      icon: MapPin,
    },
    {
      id: "destination",
      number: 4,
      title: "Destination",
      description: "Configure where users will be directed",
      completed: destinationState.status === "completed",  // Local state - instant
      content: <DestinationSetupCanvas />,
      icon: Link2,
    },
    {
      id: "budget",
      number: 5,
      title: "Ad Preview",
      description: "Review details and publish your ad",
      completed: allStepsComplete,
      content: launchContent,
      icon: Rocket,
    },
  ].map((step, index) => ({
    ...step,
    number: index + 1,
  }))
  
  return (
    <div className="flex flex-1 h-full flex-col relative min-h-0">
      <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
        <CampaignStepper steps={steps} campaignId={campaign?.id} />
      </div>
      
      {/* Publish Flow Dialog */}
      <PublishFlowDialog
        open={publishDialogOpen}
        onOpenChange={handlePublishDialogClose}
        campaignName={campaign?.name || "your ad"}
        isEditMode={isEditingExistingAd}
        onComplete={handlePublishComplete}
        goalType={(() => {
          const goalLabels: Record<string, string> = {
            'leads': 'Leads',
            'website-visits': 'Website Visits',
            'calls': 'Calls',
          }
          const goal = goalState.selectedGoal || campaign?.initial_goal
          return goal ? goalLabels[goal] || goal : undefined
        })()}
        dailyBudget={budgetState.dailyBudget > 0 ? `$${budgetState.dailyBudget}` : undefined}
        locationCount={locationState.locations.length}
        adAccountName={(() => {
          if (!campaign?.id) return undefined
          const summary = metaStorage.getConnectionSummary(campaign.id)
          return summary?.adAccount?.name || summary?.adAccount?.id
        })()}
        creativeSummary={(() => {
          const selectedCopy = getSelectedCopy()
          return selectedCopy?.headline || adContent?.headline
        })()}
        currency={budgetState.currency}
        onBudgetChange={(newBudget) => {
          setDailyBudget(newBudget)
        }}
      />
    </div>
  )
}
