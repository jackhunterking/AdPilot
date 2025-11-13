/**
 * Feature: Campaign Workspace - URL-Based View Routing
 * Purpose: Manage all ad views within a campaign with clean URL-based navigation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useCallback, useMemo, useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { PreviewPanel } from "@/components/preview-panel"
import { ResultsPanel } from "@/components/results/results-panel"
import { WorkspaceHeader } from "@/components/workspace-header"
import { AllAdsGrid } from "@/components/all-ads-grid"
import { ABTestBuilder } from "@/components/ab-test/ab-test-builder"
import { PublishFlowDialog } from "@/components/launch/publish-flow-dialog"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useLocation } from "@/lib/context/location-context"
import { useAdCopy } from "@/lib/context/ad-copy-context"
import { useBudget } from "@/lib/context/budget-context"
import { useCampaignAds } from "@/lib/hooks/use-campaign-ads"
import { useGoal } from "@/lib/context/goal-context"
import { useDestination } from "@/lib/context/destination-context"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { useDraftAutoSave } from "@/lib/hooks/use-draft-auto-save"
import { usePublishAd } from "@/lib/hooks/use-publish-ad"
import { useMultipleAdsStatusSubscription } from "@/lib/hooks/use-ad-status-subscription"
import { metaStorage } from "@/lib/meta/storage"
import { validateAdForPublish, formatValidationError } from "@/lib/utils/ad-validation"
import { operationLocks } from "@/lib/utils/ad-operations"
import type { WorkspaceMode, CampaignStatus, AdVariant } from "@/lib/types/workspace"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export function CampaignWorkspace() {
  const { campaign, updateBudget } = useCampaignContext()
  const { goalState } = useGoal()
  const { destinationState, clearDestination, setDestination } = useDestination()
  const { adContent, resetAdPreview, selectedImageIndex, selectedCreativeVariation, setIsPublished, setAdContent, setSelectedImageIndex, setSelectedCreativeVariation } = useAdPreview()
  const { clearLocations, locationState, addLocations } = useLocation()
  const { adCopyState, getSelectedCopy, resetAdCopy, setCustomCopyVariations, setSelectedCopyIndex } = useAdCopy()
  const { budgetState, isComplete: isBudgetComplete } = useBudget()
  const { metaStatus, paymentStatus } = useMetaConnection()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const campaignId = campaign?.id ?? ""
  const { ads, refreshAds, updateAdStatus, deleteAd } = useCampaignAds(campaignId)
  const { publishAd, isPublishing: isPublishingHook } = usePublishAd()
  
  // Subscribe to real-time status updates for all ads in campaign
  useMultipleAdsStatusSubscription({
    campaignId,
    onAnyStatusChange: (adId, newStatus) => {
      console.log(`[CampaignWorkspace] Ad ${adId} status changed to ${newStatus}`)
      void refreshAds()
    },
    enabled: !!campaignId
  })
  
  // Removed saveSuccessState - now using toast notifications instead
  
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // State for publish flow from All Ads
  const [publishingAdId, setPublishingAdId] = useState<string | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  
  // State for unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showCancelNewAdDialog, setShowCancelNewAdDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  
  // Track current step and publishing state
  const [currentStepId, setCurrentStepId] = useState<string>('ads')
  const [isPublishing, setIsPublishing] = useState(false)
  
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
  
  // Listen for publish complete events
  useEffect(() => {
    const handlePublishComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{
        campaignId: string
        campaignName: string
        adId: string
        published: boolean
        timestamp: number
      }>
      
      // Only handle events for this campaign
      if (customEvent.detail.campaignId !== campaignId) return
      
      console.log('[CampaignWorkspace] Publish complete event received:', customEvent.detail)
      
      // Refresh ads data
      void refreshAds()
      
      // Switch to all-ads view and save preference
      setWorkspaceMode('all-ads')
      
      // Reset publishing state
      setIsPublishing(false)
      
      // Show success toast
      if (customEvent.detail.published) {
        toast.success('Your ad has been published successfully.')
      } else {
        toast.success('Ad saved successfully!')
      }
    }
    
    window.addEventListener('campaign:publish-complete', handlePublishComplete)
    return () => {
      window.removeEventListener('campaign:publish-complete', handlePublishComplete)
    }
  }, [campaignId, refreshAds, router, pathname])
  
  // Check payment method status
  useEffect(() => {
    if (!campaign?.id || typeof window === "undefined") {
      setHasPaymentMethod(false)
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

          if (!res.ok) return

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
            console.error("[CampaignWorkspace] Failed to verify payment capability", error)
            setHasPaymentMethod(false)
          }
        }
      }

      void verifyFunding()

      return () => {
        cancelled = true
      }
    } catch (error) {
      console.error("[CampaignWorkspace] Payment verification error", error)
    }
  }, [campaign?.id, budgetState.selectedAdAccount])
  
  // Check Meta connection status
  const isMetaConnectionComplete = useMemo(() => {
    const states = campaign?.campaign_states as { meta_connect_data?: { status?: string } } | null | undefined
    const metaConnectData = states?.meta_connect_data
    const serverConnected = Boolean(metaConnectData?.status === 'connected' || metaConnectData?.status === 'selected_assets')
    
    const budgetConnected = budgetState.isConnected === true
    
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
    
    return serverConnected || budgetConnected || localStorageConnected
  }, [campaign?.campaign_states, campaign?.id, budgetState.isConnected])
  
  // Get view mode from URL
  const viewParam = searchParams.get("view") as WorkspaceMode | null
  const currentAdId = searchParams.get("adId")
  const isCreatingVariant = searchParams.get('variant') === 'true'
  
  // Check if this is first visit after campaign creation
  const isFirstVisit = searchParams.get('firstVisit') === 'true'
  
  // Default view logic:
  // - First visit with view=build → Builder mode (with draft ad)
  // - Has explicit view param → Use that view
  // - Otherwise → All Ads view
  const effectiveMode: WorkspaceMode = isFirstVisit && viewParam === 'build' 
    ? 'build' 
    : viewParam || 'all-ads'
  
  // Auto-save draft ads while building or editing
  const isBuilding = effectiveMode === 'build' || effectiveMode === 'edit'
  useDraftAutoSave(
    campaignId,
    currentAdId,
    isBuilding // Only auto-save when in build/edit mode
  )

  // Convert CampaignAd to AdVariant using snapshot data as source of truth
  const convertedAds: AdVariant[] = useMemo(() => {
    return ads.map(ad => {
      console.log('[CampaignWorkspace] 🔍 Processing ad:', {
        id: ad.id,
        name: ad.name,
        hasSnapshot: !!ad.setup_snapshot,
        hasCreativeData: !!ad.creative_data,
        hasCopyData: !!ad.copy_data,
      })
      
      // Try to use setup_snapshot first, fall back to copy_data, then creative_data
      const snapshot = ad.setup_snapshot as Record<string, unknown> | null
      const copyData = ad.copy_data as Record<string, unknown> | null
      const creativeData = ad.creative_data as Record<string, unknown> | null
      
      let creative_data: AdVariant['creative_data']
      
      // First, try snapshot
      if (snapshot?.creative && snapshot?.copy) {
        const creativeSnapshot = snapshot.creative as {
          imageUrl?: string
          imageVariations?: string[]
          selectedImageIndex?: number | null
        }
        const copySnapshot = snapshot.copy as {
          headline: string
          primaryText: string
          description: string
          cta: string
        }
        
        // Build creative_data from snapshot - snapshot is the source of truth
        const selectedIndex = creativeSnapshot.selectedImageIndex ?? 0
        creative_data = {
          imageUrl: creativeSnapshot.imageVariations?.[selectedIndex] || creativeSnapshot.imageUrl,
          imageVariations: creativeSnapshot.imageVariations,
          headline: copySnapshot.headline,
          body: copySnapshot.primaryText,
          primaryText: copySnapshot.primaryText,
          description: copySnapshot.description,
          cta: copySnapshot.cta,
          format: 'feed' as const,
        }
        
        console.log('[CampaignWorkspace] ✅ Using snapshot data:', {
          adId: ad.id,
          headline: copySnapshot.headline,
          primaryText: copySnapshot.primaryText?.substring(0, 50) + '...',
          description: copySnapshot.description?.substring(0, 30) + '...',
        })
      } 
      // Second, try copy_data field (saved separately)
      else if (copyData && (copyData.headline || copyData.primaryText)) {
        creative_data = {
          imageUrl: creativeData?.imageUrl as string | undefined,
          imageVariations: creativeData?.imageVariations as string[] | undefined,
          headline: (copyData.headline as string) || '',
          body: (copyData.primaryText as string) || '',
          primaryText: (copyData.primaryText as string) || '',
          description: (copyData.description as string) || '',
          cta: (copyData.cta as string) || 'Learn More',
          format: 'feed' as const,
        }
        
        console.log('[CampaignWorkspace] ✅ Using copy_data field:', {
          adId: ad.id,
          headline: copyData.headline,
          primaryText: (copyData.primaryText as string)?.substring(0, 50) + '...',
        })
      }
      // Finally, fallback to legacy creative_data
      else {
        creative_data = (ad.creative_data as AdVariant['creative_data']) || {
          headline: '',
          body: '',
          cta: '',
        }
        
        console.warn('[CampaignWorkspace] ⚠️ Using legacy fallback data for ad:', ad.id)
      }
      
      const metaAdId = typeof ad.meta_ad_id === 'string' && ad.meta_ad_id.trim().length > 0
        ? ad.meta_ad_id
        : null

      const normalizedStatus: 'draft' | 'active' | 'learning' | 'paused' | 'archived' =
        metaAdId ? (ad.status as 'draft' | 'active' | 'learning' | 'paused' | 'archived') : 'draft'

      return {
        id: ad.id,
        campaign_id: ad.campaign_id,
        name: ad.name,
        status: normalizedStatus,
        variant_type: 'original' as const,
        creative_data,
        metrics_snapshot: ad.metrics_snapshot as AdVariant['metrics_snapshot'],
        meta_ad_id: metaAdId || undefined,
        created_at: ad.created_at,
        updated_at: ad.updated_at,
      }
    })
  }, [ads])

  // Track if campaign has any published ads (active or paused)
  const hasPublishedAds = useMemo(() => {
    return convertedAds.some(ad => ad.status === 'active' || ad.status === 'paused')
  }, [convertedAds])
  
  // Update URL when mode changes and persist last view in session storage
  const setWorkspaceMode = useCallback((mode: WorkspaceMode, adId?: string) => {
    const params = new URLSearchParams()
    params.set("view", mode)
    if (adId) params.set("adId", adId)
    router.replace(`${pathname}?${params.toString()}`)
    
    // Persist last view in session storage for this campaign
    if (campaignId) {
      try {
        sessionStorage.setItem(`campaign:${campaignId}:lastView`, mode)
      } catch (error) {
        console.warn('[CampaignWorkspace] Failed to save last view to sessionStorage:', error)
      }
    }
  }, [pathname, router, campaignId])
  
  // Auto-resume builder for single draft campaigns
  useEffect(() => {
    // Only run when component is ready with ads data
    if (!campaignId || ads.length === 0) return
    
    // Skip if we already have a view parameter (user explicitly navigating)
    if (viewParam) return
    
    // Skip if this is first visit (already handled by firstVisit flag)
    if (isFirstVisit) return
    
    // Check if we have exactly one ad and it's a draft
    const hasSingleDraft = ads.length === 1 && !hasPublishedAds
    
    if (hasSingleDraft) {
      // Check stored last view preference
      let lastView: string | null = null
      try {
        lastView = sessionStorage.getItem(`campaign:${campaignId}:lastView`)
      } catch (error) {
        console.warn('[CampaignWorkspace] Failed to read lastView from sessionStorage:', error)
      }
      
      // If user explicitly went to All Ads view, respect that
      if (lastView === 'all-ads') {
        return
      }
      
      // Auto-navigate to builder with the single draft
      const draftAd = ads[0]
      if (draftAd) {
        console.log('[CampaignWorkspace] Auto-resuming single draft in builder:', draftAd.id)
        setWorkspaceMode('build', draftAd.id)
      }
    }
  }, [campaignId, ads, viewParam, isFirstVisit, hasPublishedAds, setWorkspaceMode])
  
  // Calculate if ad is ready to publish
  const isPublishReady = useMemo(() => {
    return (
      selectedImageIndex !== null &&
      adCopyState.status === "completed" &&
      destinationState.status === "completed" &&
      locationState.status === "completed" &&
      isMetaConnectionComplete &&
      hasPaymentMethod &&
      isBudgetComplete()
    )
  }, [
    selectedImageIndex,
    adCopyState.status,
    destinationState.status,
    locationState.status,
    isMetaConnectionComplete,
    hasPaymentMethod,
    isBudgetComplete,
  ])
  
  // Check if current ad is published (has meta_ad_id)
  const isAdPublished = useMemo(() => {
    if (!currentAdId) return false
    const ad = convertedAds.find(a => a.id === currentAdId)
    return Boolean(ad?.meta_ad_id)
  }, [currentAdId, convertedAds])

  // Helper to detect if user has made progress in build mode
  const hasBuildProgress = useMemo(() => {
    if (effectiveMode !== 'build') return false
    
    // Check if any creative work has been done
    const hasCreativeWork = Boolean(
      adContent?.imageUrl || 
      adContent?.imageVariations?.length ||
      adContent?.headline ||
      adContent?.body ||
      adContent?.cta
    )
    
    const hasLocationWork = locationState.locations.length > 0
    const hasCopyWork = (adCopyState.customCopyVariations?.length ?? 0) > 0
    
    return hasCreativeWork || hasLocationWork || hasCopyWork
  }, [effectiveMode, adContent, locationState.locations, adCopyState.customCopyVariations])

  // Track unsaved changes in edit mode and progress in build mode
  useEffect(() => {
    const isCreatingNewAd = searchParams.get('newAd') === 'true'
    
    if (effectiveMode === 'edit' && currentAdId) {
      // Mark as having unsaved changes when in edit mode
      // This will be reset when Save & Publish is successful
      setHasUnsavedChanges(true)
    } else if (effectiveMode === 'build') {
      // If creating a new ad, ALWAYS consider it as having unsaved changes
      // because a draft record was created in DB that needs cleanup if cancelled
      if (isCreatingNewAd) {
        setHasUnsavedChanges(true)
      } else if (hasPublishedAds) {
        // For subsequent ads (when published ads exist), track actual build progress
        setHasUnsavedChanges(hasBuildProgress)
      } else {
        setHasUnsavedChanges(false)
      }
    } else {
      setHasUnsavedChanges(false)
    }
  }, [effectiveMode, currentAdId, hasPublishedAds, hasBuildProgress, searchParams])


  // Navigation handlers
  const handleBack = useCallback(() => {
    const navigateToAllAds = () => {
      if (effectiveMode === 'results' || effectiveMode === 'edit' || effectiveMode === 'ab-test-builder') {
        // All these modes navigate to all-ads grid
        setWorkspaceMode('all-ads')
      } else if (effectiveMode === 'build') {
        // Navigate to all-ads (button only shows when ads exist)
        setWorkspaceMode('all-ads')
      }
    }
    
    const isCreatingNewAd = searchParams.get('newAd') === 'true'
    
    // Check for unsaved changes in BOTH edit and build modes
    if ((effectiveMode === 'edit' || effectiveMode === 'build') && hasUnsavedChanges) {
      setPendingNavigation(() => navigateToAllAds)
      // Show different dialog for new ad creation vs edits
      if (isCreatingNewAd && effectiveMode === 'build') {
        setShowCancelNewAdDialog(true)
      } else {
        setShowUnsavedDialog(true)
      }
    } else {
      navigateToAllAds()
    }
  }, [effectiveMode, hasPublishedAds, hasUnsavedChanges, setWorkspaceMode, searchParams])

  const handleNewAd = useCallback(async () => {
    const traceId = `new_ad_${Date.now()}`
    const lockKey = `create_ad_${campaignId}`
    
    // Check if operation is already in progress
    if (operationLocks.isLocked(lockKey)) {
      console.warn(`[${traceId}] Create operation already in progress`)
      toast.info('Already creating an ad - please wait')
      return
    }
    
    // Acquire lock
    const releaseLock = await operationLocks.acquire(lockKey)
    
    console.log(`[${traceId}] Creating new ad - resetting creative state`)
    
    // Step 1: Create draft ad record in database
    try {
      // Show loading toast
      const loadingToast = toast.loading('Creating new ad...')
      
      const response = await fetch(`/api/campaigns/${campaignId}/ads/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      // Dismiss loading toast
      toast.dismiss(loadingToast)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMsg = errorData.error || `Failed to create draft ad (${response.status})`
        
        console.error(`[${traceId}] Failed to create draft ad:`, {
          status: response.status,
          error: errorMsg
        })
        
        // User-friendly error messages
        if (response.status === 403) {
          toast.error("You don't have permission to create ads in this campaign")
        } else if (response.status === 404) {
          toast.error('Campaign not found')
        } else if (response.status === 500) {
          toast.error('Server error - please try again')
        } else {
          toast.error(errorMsg)
        }
        return
      }
      
      const data = await response.json()
      
      // Validate response structure
      if (!data || !data.ad || !data.ad.id) {
        console.error(`[${traceId}] Invalid response structure:`, data)
        toast.error('Invalid response from server')
        return
      }
      
      const newAdId = data.ad.id
      console.log(`[${traceId}] ✅ Created draft ad:`, {
        adId: newAdId,
        name: data.ad.name
      })
      
      // Step 2: Reset all creative-related contexts
      resetAdPreview()
      resetAdCopy()
      clearDestination()
      clearLocations()
      
      // Step 3: Generate new conversation ID to force AI chat reset
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Step 4: Clear session storage for stepper to force step 0
      if (campaignId) {
        try {
          sessionStorage.removeItem(`campaign:${campaignId}:lastStepId`)
          sessionStorage.removeItem(`auto-submitted-${campaignId}`)
          sessionStorage.removeItem(`new-ad-auto-submitted-${campaignId}`)
          console.log(`[${traceId}] Cleared session storage for campaign:`, campaignId)
        } catch (storageError) {
          console.warn(`[${traceId}] Failed to clear session storage:`, storageError)
          // Continue anyway - not critical
        }
      }
      
      // Step 5: Navigate to build mode with adId and newAd flag
      // Goal and budget are locked (inherited from campaign)
      // User can only modify creative and location
      const params = new URLSearchParams()
      params.set("view", "build")
      params.set("adId", newAdId)
      params.set("newAd", "true")
      params.set("conversationId", newConversationId)
      
      // If clicking "New Ad" from all-ads or results view, we're creating a variant
      // (The button is only shown in these modes, which means published ads exist)
      if (effectiveMode === 'all-ads' || effectiveMode === 'results') {
        params.set("variant", "true")
      }
      
      console.log(`[${traceId}] Navigating to build mode with adId:`, newAdId)
      router.replace(`${pathname}?${params.toString()}`)
      
      // Show success toast
      toast.success('New ad created - start building!')
      
    } catch (error) {
      console.error(`[${traceId}] Unexpected error creating draft ad:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Network error or other exception
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error - check your connection and try again')
      } else {
        toast.error('Failed to create new ad - please try again')
      }
    } finally {
      // Always release lock
      releaseLock()
    }
  }, [campaignId, effectiveMode, pathname, router, resetAdPreview, resetAdCopy, clearDestination, clearLocations])

  const handleViewAllAds = useCallback(() => {
    setWorkspaceMode('all-ads')
  }, [setWorkspaceMode])
  
  // Handler for Save Draft (dispatches event to PreviewPanel)
  const handleSaveDraftRequest = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('saveDraftRequested'))
    }
  }, [])
  
  // Handler for Publish (dispatches event to PreviewPanel)
  const handlePublishRequest = useCallback(() => {
    if (typeof window !== 'undefined') {
      setIsPublishing(true)
      window.dispatchEvent(new CustomEvent('publishRequested'))
    }
  }, [])

  const handleViewAd = useCallback(() => {
    setWorkspaceMode('results')
  }, [setWorkspaceMode])

  const handleEditAd = useCallback(async (adId: string) => {
    const traceId = `edit_ad_${adId.substring(0, 8)}_${Date.now()}`
    console.log(`[${traceId}] Entering edit mode for ad:`, adId)
    
    try {
      // Find the ad being edited
      const adToEdit = ads.find(ad => ad.id === adId)
      
      if (!adToEdit) {
        console.error(`[${traceId}] Ad not found:`, adId)
        toast.error('Ad not found')
        return
      }
      
      // Check if ad has a setup_snapshot
      const snapshot = adToEdit.setup_snapshot as Record<string, unknown> | null
      
      if (snapshot) {
        console.log(`[${traceId}] Found snapshot, hydrating contexts...`)
        
        // Import hydration utilities
        const { 
          hydrateAdPreviewFromSnapshot, 
          hydrateAdCopyFromSnapshot, 
          hydrateLocationFromSnapshot, 
          hydrateDestinationFromSnapshot,
          isValidSnapshot
        } = await import('@/lib/utils/snapshot-hydration')
        
        // Validate snapshot structure
        if (!isValidSnapshot(snapshot)) {
          console.warn(`[${traceId}] Invalid snapshot structure, using legacy fallback`)
        } else {
          // Hydrate ad preview context
          const adPreviewData = hydrateAdPreviewFromSnapshot(snapshot)
          setAdContent(adPreviewData.adContent)
          setSelectedImageIndex(adPreviewData.selectedImageIndex)
          setSelectedCreativeVariation(adPreviewData.selectedCreativeVariation)
          console.log(`[${traceId}] ✅ Hydrated ad preview from snapshot`)
          
          // Hydrate ad copy context
          const adCopyData = hydrateAdCopyFromSnapshot(snapshot)
          if (adCopyData.customCopyVariations) {
            setCustomCopyVariations(adCopyData.customCopyVariations)
          }
          setSelectedCopyIndex(adCopyData.selectedCopyIndex)
          console.log(`[${traceId}] ✅ Hydrated ad copy from snapshot`)
          
          // Hydrate location context
          const locationData = hydrateLocationFromSnapshot(snapshot)
          if (locationData.locations.length > 0) {
            addLocations(locationData.locations, false) // Replace, don't merge
          }
          console.log(`[${traceId}] ✅ Hydrated locations from snapshot`)
          
          // Hydrate destination context
          const destinationData = hydrateDestinationFromSnapshot(snapshot)
          if (destinationData.data) {
            setDestination(destinationData.data)
          }
          console.log(`[${traceId}] ✅ Hydrated destination from snapshot`)
        }
      } else {
        console.log(`[${traceId}] No snapshot found, using legacy data from creative_data and copy_data`)
        
        // Fallback: Use legacy creative_data and copy_data if available
        const creativeData = adToEdit.creative_data as Record<string, unknown> | null
        const copyData = adToEdit.copy_data as Record<string, unknown> | null
        
        if (creativeData) {
          setAdContent({
            imageUrl: creativeData.imageUrl as string | undefined,
            imageVariations: (creativeData.imageVariations as string[]) || [],
            baseImageUrl: creativeData.baseImageUrl as string | undefined,
            headline: (copyData?.headline as string) || (creativeData.headline as string) || '',
            body: (copyData?.primaryText as string) || (creativeData.body as string) || '',
            cta: (copyData?.cta as string) || (creativeData.cta as string) || 'Learn More',
          })
          console.log(`[${traceId}] ✅ Loaded creative from legacy creative_data`)
        }
        
        if (copyData && (copyData.headline || copyData.primaryText)) {
          // Copy data exists, we've already set it above
          console.log(`[${traceId}] ✅ Loaded copy from legacy copy_data`)
        }
      }
      
      // Navigate to edit mode
      setWorkspaceMode('edit', adId)
      console.log(`[${traceId}] Successfully entered edit mode`)
      
    } catch (error) {
      console.error(`[${traceId}] Error entering edit mode:`, error)
      toast.error('Failed to load ad for editing')
    }
  }, [ads, setAdContent, setSelectedImageIndex, setSelectedCreativeVariation, setCustomCopyVariations, setSelectedCopyIndex, addLocations, setDestination, setWorkspaceMode])

  const getMetaToken = useCallback(() => {
    if (typeof window === 'undefined' || !campaignId) return null
    try {
      const connection = metaStorage.getConnectionWithToken?.(campaignId) ?? metaStorage.getConnection(campaignId)
      const token = connection?.long_lived_user_token || connection?.user_app_token || null
      if (!token) {
        console.warn('[CampaignWorkspace] No Meta token found in localStorage for campaign', campaignId)
      }
      return token
    } catch (error) {
      console.error('[CampaignWorkspace] Failed to read Meta token from localStorage:', error)
      return null
    }
  }, [campaignId])

  const handlePauseAd = useCallback(async (adId: string): Promise<boolean> => {
    const previousStatus = ads.find(ad => ad.id === adId)?.status ?? null
    const targetAd = convertedAds.find(ad => ad.id === adId)
    const hasMetaId = Boolean(targetAd?.meta_ad_id)

    if (!hasMetaId) {
      console.warn('[CampaignWorkspace] Pause skipped: ad has no meta_ad_id (draft)', { adId })
      return false
    }

    console.log('[CampaignWorkspace] Pausing ad (optimistic):', { adId, previousStatus })
    updateAdStatus(adId, 'paused')

    const token = getMetaToken()

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}/pause`, {
        method: 'POST',
        headers: token ? { 'Content-Type': 'application/json' } : undefined,
        body: token ? JSON.stringify({ token }) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[CampaignWorkspace] Failed to pause ad:', errorData)
        if (previousStatus) {
          updateAdStatus(adId, previousStatus)
        }
        // TODO: Show error toast
        return false
      }
      
      console.log('[CampaignWorkspace] Ad paused successfully:', adId)
      
      // Refresh ads list to update status
      await refreshAds()
      console.log('[CampaignWorkspace] Ads refreshed after pause:', { adId })
      
      return true
    } catch (error) {
      console.error('[CampaignWorkspace] Error pausing ad:', error)
      if (previousStatus) {
        updateAdStatus(adId, previousStatus)
      }
      // TODO: Show error toast
      return false
    }
  }, [ads, campaignId, convertedAds, getMetaToken, refreshAds, updateAdStatus])

  const handleResumeAd = useCallback(async (adId: string): Promise<boolean> => {
    const previousStatus = ads.find(ad => ad.id === adId)?.status ?? null
    const targetAd = convertedAds.find(ad => ad.id === adId)
    const hasMetaId = Boolean(targetAd?.meta_ad_id)

    if (!hasMetaId) {
      console.warn('[CampaignWorkspace] Resume skipped: ad has no meta_ad_id (draft)', { adId })
      return false
    }

    console.log('[CampaignWorkspace] Resuming ad (optimistic):', { adId, previousStatus })
    updateAdStatus(adId, 'active')

    const token = getMetaToken()

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}/resume`, {
        method: 'POST',
        headers: token ? { 'Content-Type': 'application/json' } : undefined,
        body: token ? JSON.stringify({ token }) : undefined,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('[CampaignWorkspace] Failed to resume ad:', errorData)
        if (previousStatus) {
          updateAdStatus(adId, previousStatus)
        }
        // TODO: Show error toast
        return false
      }
      
      console.log('[CampaignWorkspace] Ad resumed successfully:', adId)
      
      // Refresh ads list to update status
      await refreshAds()
      console.log('[CampaignWorkspace] Ads refreshed after resume:', { adId })
      
      return true
    } catch (error) {
      console.error('[CampaignWorkspace] Error resuming ad:', error)
      if (previousStatus) {
        updateAdStatus(adId, previousStatus)
      }
      // TODO: Show error toast
      return false
    }
  }, [ads, campaignId, convertedAds, getMetaToken, refreshAds, updateAdStatus])

  const handlePublishAd = useCallback(async (adId: string) => {
    // Use new publish hook
    const result = await publishAd(campaignId, adId)
    
    if (result.success) {
      // Refresh ads to show new status
      await refreshAds()
      
      // Navigate to all-ads view
      setWorkspaceMode('all-ads')
    }
  }, [campaignId, publishAd, refreshAds])
  
  // Handle publish complete (called by PublishFlowDialog)
  const handlePublishComplete = useCallback(async () => {
    if (!publishingAdId) return
    
    try {
      console.log('[CampaignWorkspace] Publishing ad:', publishingAdId)
      
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${publishingAdId}/publish`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('[CampaignWorkspace] Failed to publish ad:', errorData)
        
        // Extract user-friendly error message
        const userMessage = errorData?.error?.userMessage || errorData?.error?.message || errorData?.error || 'Failed to publish ad'
        const suggestedAction = errorData?.error?.suggestedAction
        
        // Show error with suggested action if available
        if (suggestedAction) {
          toast.error(userMessage, {
            description: `Suggested action: ${suggestedAction}`,
            duration: 8000
          })
        } else {
          toast.error(userMessage)
        }
        
        setShowPublishDialog(false)
        setPublishingAdId(null)
        return
      }
      
      const { ad } = await response.json()
      console.log('[CampaignWorkspace] Ad published successfully:', publishingAdId)
      
      // Show success toast
      toast.success('Ad submitted for review!')
      
      // Refresh ads list to update status
      await refreshAds()
      
      // Close dialog and clear state
      setShowPublishDialog(false)
      setPublishingAdId(null)
      
      // Stay on all-ads view to show the published ad
    } catch (error) {
      console.error('[CampaignWorkspace] Error publishing ad:', error)
      toast.error('Failed to publish ad')
      setShowPublishDialog(false)
      setPublishingAdId(null)
    }
  }, [campaignId, publishingAdId, refreshAds])

  const handleDeleteAd = useCallback(async (adId: string) => {
    const traceId = `delete_ad_workspace_${adId.substring(0, 8)}_${Date.now()}`
    const lockKey = `delete_ad_${adId}`
    
    // Check if operation is already in progress
    if (operationLocks.isLocked(lockKey)) {
      console.warn(`[${traceId}] Delete operation already in progress for ad:`, adId)
      toast.info('Delete already in progress')
      return
    }
    
    // Acquire lock
    const releaseLock = await operationLocks.acquire(lockKey)
    
    try {
      console.log(`[${traceId}] Delete ad initiated:`, { adId, campaignId })
      
      // Show loading toast
      const loadingToast = toast.loading('Deleting ad...')
      
      // Call the delete function from hook (which handles the API call)
      const result = await deleteAd(adId)
      
      // Dismiss loading toast
      toast.dismiss(loadingToast)
      
      if (!result.success) {
        console.error(`[${traceId}] Delete failed:`, result.error)
        
        // Show user-friendly error message
        if (result.error?.includes('already deleted')) {
          toast.info('Ad was already deleted')
        } else {
          toast.error(result.error || 'Failed to delete ad')
        }
        
        // Even if backend says already deleted, refresh to sync state
        await refreshAds()
        return
      }
      
      console.log(`[${traceId}] Delete successful, refreshing ads list`)
      
      // Force refresh ads list to ensure UI is in sync
      await refreshAds()
      
      // If we're viewing the deleted ad, navigate away
      if (currentAdId === adId) {
        console.log(`[${traceId}] Currently viewing deleted ad, navigating to all-ads`)
        setWorkspaceMode('all-ads')
      }
      
      // Show success message
      toast.success('Ad deleted successfully')
      
      console.log(`[${traceId}] Delete operation completed successfully`)
      
    } catch (error) {
      console.error(`[${traceId}] Unexpected error during deletion:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // Show error toast
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error - check your connection')
      } else {
        toast.error('Failed to delete ad - please try again')
      }
      
      // Try to refresh anyway to sync state
      try {
        await refreshAds()
      } catch (refreshError) {
        console.error(`[${traceId}] Failed to refresh after error:`, refreshError)
      }
    } finally {
      // Always release lock
      releaseLock()
    }
  }, [campaignId, currentAdId, deleteAd, refreshAds, setWorkspaceMode])

  const handleCreateABTest = useCallback((adId: string) => {
    setWorkspaceMode('ab-test-builder', adId)
  }, [setWorkspaceMode])

  // Validation function to check if ad is ready to create
  const isAdReadyToCreate = useCallback((): boolean => {
    // Check all ad-level states are completed
    const statesComplete = 
      destinationState.status === 'completed' &&
      locationState.status === 'completed' &&
      adCopyState.status === 'completed'
    
    // Check ad content exists (images + copy)
    const hasAdContent = 
      adContent &&
      adContent.imageVariations &&
      adContent.imageVariations.length > 0 &&
      adContent.headline &&
      adContent.body &&
      adContent.cta
    
    // Check Meta connection and payment
    const metaReady = 
      metaStatus === 'connected' &&
      paymentStatus === 'verified'
    
    // Check budget is set
    const budgetReady = isBudgetComplete()
    
    return !!(statesComplete && hasAdContent && metaReady && budgetReady)
  }, [
    destinationState.status,
    locationState.status,
    adCopyState.status,
    adContent,
    metaStatus,
    paymentStatus,
    isBudgetComplete,
  ])

  // Common save logic for both build and edit modes
  const handleSaveAdData = useCallback(async (adId: string, isEditMode: boolean = false) => {
    if (!campaign?.id || isSaving) return false
    
    setIsSaving(true)
    
    try {
      // Import the snapshot builder dynamically
      const { buildAdSnapshot } = await import('@/lib/services/ad-snapshot-builder')
      
      // Build complete snapshot from wizard contexts
      const snapshot = buildAdSnapshot({
        adPreview: {
          adContent,
          selectedImageIndex,
          selectedCreativeVariation,
        },
        adCopy: adCopyState,
        destination: destinationState,
        location: locationState,
        goal: goalState,
        budget: budgetState,
      })
      
      // Gather the finalized ad data from snapshot - use canonical copy source
      const selectedCopy = getSelectedCopy()
      
      const selectedImageUrl = selectedImageIndex !== null && adContent?.imageVariations?.[selectedImageIndex]
        ? adContent.imageVariations[selectedImageIndex]
        : adContent?.imageUrl || adContent?.imageVariations?.[0]
      
      // Prepare the ad data for persistence
      const adData = {
        name: `${campaign.name} - ${isEditMode ? 'Ad' : 'Draft'} ${new Date().toLocaleDateString()}`,
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
      
      console.log('📦 Ad data being sent to API:', {
        adId,
        name: adData.name,
        isEditMode,
      })
      
      // Update the ad in Supabase (keeps status as draft or current status)
      const response = await fetch(`/api/campaigns/${campaign.id}/ads/${adId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adData),
      })
      
      if (!response.ok) {
        console.error('Failed to update ad:', await response.text())
        toast.error('Failed to save ad')
        return false
      }
      
      const { ad } = await response.json()
      console.log(`✅ Ad saved:`, ad.id)
      
      return true
    } catch (error) {
      console.error('Error in handleSaveAdData:', error)
      toast.error('Failed to save ad')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    campaign?.id,
    campaign?.name,
    isSaving,
    adContent,
    selectedImageIndex,
    selectedCreativeVariation,
    adCopyState,
    destinationState,
    locationState,
    goalState,
    budgetState,
    getSelectedCopy,
  ])

  // Handle Create Ad action from header (build mode)
  const handleCreateAd = useCallback(async () => {
    if (!campaign?.id || isSaving) return
    
    // Get the current ad ID from URL
    const adId = searchParams.get('adId')
    if (!adId) {
      toast.error('No ad draft found')
      return
    }
    
    // Save ad data
    const success = await handleSaveAdData(adId, false)
    
    if (success) {
      // Show success toast
      toast.success('Ad created as draft!')
      
      // Mark as published in context and clear unsaved changes
      setIsPublished(true)
      setHasUnsavedChanges(false)
      
      // Refresh ads data
      await refreshAds()
      
      // Navigate to All Ads view and save preference
      setWorkspaceMode('all-ads')
    }
  }, [campaign?.id, campaign?.name, isSaving, searchParams, handleSaveAdData, setIsPublished, refreshAds, setWorkspaceMode])

  // Handle Save action from header (edit mode)
  const handleSave = useCallback(async () => {
    if (!campaign?.id || !currentAdId || isSaving) return
    
    // Save ad data
    const success = await handleSaveAdData(currentAdId, true)
    
    if (success) {
      // Show success toast
      toast.success('Ad saved successfully!')
      
      // Clear unsaved changes
      setHasUnsavedChanges(false)
      
      // Refresh ads data
      await refreshAds()
      
      // Navigate to All Ads view and save preference
      setWorkspaceMode('all-ads')
    }
  }, [campaign?.id, campaign?.name, currentAdId, isSaving, handleSaveAdData, refreshAds, setWorkspaceMode])

  
  // Unsaved changes dialog handlers
  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedDialog(false)
    setHasUnsavedChanges(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }, [pendingNavigation])
  
  const handleCancelDiscard = useCallback(() => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }, [])

  // Determine header props
  // Always show New Ad button in results and all-ads modes
  const showNewAdButton = effectiveMode === 'results' || effectiveMode === 'all-ads'
  // Show back button in all modes except all-ads
  const showBackButton = (() => {
    // Never show in all-ads mode (it's the home base)
    if (effectiveMode === 'all-ads') return false
    
    // Always show in other modes (results, edit, ab-test-builder, build)
    return true
  })()


  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full min-h-0 relative">
      {/* Workspace Header */}
      <WorkspaceHeader
        mode={effectiveMode}
        onBack={showBackButton ? handleBack : undefined}
        onNewAd={handleNewAd}
        showBackButton={showBackButton}
        showNewAdButton={showNewAdButton}
        campaignStatus={campaign?.published_status as CampaignStatus}
        totalAds={convertedAds.length}
        hasPublishedAds={hasPublishedAds}
        metaConnectionStatus={metaStatus}
        paymentStatus={paymentStatus}
        campaignBudget={campaign?.campaign_budget ?? null}
        onBudgetUpdate={updateBudget}
        onSave={effectiveMode === 'edit' ? handleSave : undefined}
        isSaveDisabled={isSaving}
        onCreateAd={effectiveMode === 'build' ? handleCreateAd : undefined}
        isCreateAdDisabled={isSaving || !isAdReadyToCreate()}
        // NEW PROPS for step-aware publish
        currentStepId={currentStepId}
        isPublishReady={isPublishReady}
        onSaveDraft={effectiveMode === 'build' ? handleSaveDraftRequest : undefined}
        onPublish={effectiveMode === 'build' || effectiveMode === 'edit' ? handlePublishRequest : undefined}
        isPublishing={isPublishing}
        currentAdId={currentAdId ?? undefined}
        onViewAllAds={handleViewAllAds}
        isAdPublished={isAdPublished}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden h-full min-h-0">
        {effectiveMode === 'build' && (
          <PreviewPanel />
        )}

        {effectiveMode === 'results' && (
          <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
            <ResultsPanel isEnabled={hasPublishedAds} />
          </div>
        )}

        {effectiveMode === 'all-ads' && (
          <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
            <AllAdsGrid
              ads={convertedAds}
              campaignId={campaignId}
              onViewAd={handleViewAd}
              onEditAd={handleEditAd}
              onPublishAd={handlePublishAd}
              onPauseAd={handlePauseAd}
              onResumeAd={handleResumeAd}
              onCreateABTest={handleCreateABTest}
              onDeleteAd={handleDeleteAd}
              onRefreshAds={refreshAds}
            />
          </div>
        )}

        {effectiveMode === 'edit' && (
          <PreviewPanel />
        )}

        {effectiveMode === 'ab-test-builder' && (() => {
          // Find current variant for A/B test builder
          const currentVariant = currentAdId ? convertedAds.find(a => a.id === currentAdId) : null
          
          if (!currentVariant) {
            return (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading ad...</p>
              </div>
            )
          }
          return (
            <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
              <ABTestBuilder
                campaign_id={campaignId}
                current_variant={currentVariant}
                onCancel={() => setWorkspaceMode('all-ads')}
                onComplete={() => {
                  // TODO: Handle test creation
                  setWorkspaceMode('all-ads')
                }}
              />
            </div>
          )
        })()}
      </div>
      
      {/* Publish Flow Dialog for All Ads Publish */}
      <PublishFlowDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        campaignName={campaign?.name || "your ad"}
        isEditMode={false}
        onComplete={handlePublishComplete}
      />
      
      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <DialogTitle className="text-xl">
                {effectiveMode === 'edit' ? 'Unsaved Changes' : 'Discard Progress?'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground mb-6">
            {effectiveMode === 'edit' 
              ? "You have unsaved changes. If you leave now, your changes will be lost. Do you want to discard your changes?"
              : "You have unsaved work on this new ad. If you go back now, all your progress will be lost. Do you want to discard your progress?"
            }
          </DialogDescription>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleCancelDiscard}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleDiscardChanges}
            >
              {effectiveMode === 'edit' ? 'Discard Changes' : 'Discard Progress'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cancel New Ad Dialog */}
      <Dialog open={showCancelNewAdDialog} onOpenChange={setShowCancelNewAdDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <DialogTitle className="text-xl">Cancel New Ad?</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground mb-6">
            Are you sure you want to cancel creating this new ad? All your progress will be lost.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowCancelNewAdDialog(false)}
            >
              Keep Working
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={async () => {
                const traceId = `cancel_draft_${Date.now()}`
                
                setShowCancelNewAdDialog(false)
                setHasUnsavedChanges(false)
                
                // Delete draft ad if it exists
                const draftAdId = searchParams.get('adId')
                if (draftAdId && campaignId) {
                  try {
                    console.log(`[${traceId}] Attempting to delete draft ad:`, draftAdId)
                    
                    const response = await fetch(`/api/campaigns/${campaignId}/ads/${draftAdId}`, {
                      method: 'DELETE'
                    })
                    
                    if (response.ok || response.status === 404) {
                      console.log(`[${traceId}] Draft ad deleted or already gone:`, draftAdId)
                    } else {
                      console.warn(`[${traceId}] Failed to delete draft ad:`, {
                        status: response.status,
                        statusText: response.statusText
                      })
                    }
                  } catch (error) {
                    console.error(`[${traceId}] Error deleting draft ad:`, error)
                    // Don't block navigation on error
                  }
                  
                  // Force refresh ads list to ensure cleanup
                  try {
                    await refreshAds()
                    console.log(`[${traceId}] Ads list refreshed after draft cleanup`)
                  } catch (refreshError) {
                    console.error(`[${traceId}] Failed to refresh ads after cleanup:`, refreshError)
                  }
                }
                
                if (pendingNavigation) {
                  pendingNavigation()
                  setPendingNavigation(null)
                }
              }}
            >
              Cancel Ad
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
