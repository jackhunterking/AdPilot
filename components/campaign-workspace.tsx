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
import { ResultsPanel } from "@/components/results-panel"
import { WorkspaceHeader } from "@/components/workspace-header"
import { AllAdsGrid } from "@/components/all-ads-grid"
import { ABTestBuilder } from "@/components/ab-test/ab-test-builder"
import { PublishFlowDialog } from "@/components/launch/publish-flow-dialog"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useLocation } from "@/lib/context/location-context"
import { useAudience } from "@/lib/context/audience-context"
import { useAdCopy } from "@/lib/context/ad-copy-context"
import { useBudget } from "@/lib/context/budget-context"
import { useCampaignAds } from "@/lib/hooks/use-campaign-ads"
import { useGoal } from "@/lib/context/goal-context"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { metaStorage } from "@/lib/meta/storage"
import { validateAdForPublish, formatValidationError } from "@/lib/utils/ad-validation"
import type { WorkspaceMode, CampaignStatus, AdVariant, AdMetrics, LeadFormInfo } from "@/lib/types/workspace"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface SaveSuccessState {
  campaignName: string
  isEdit: boolean
  adId: string
  timestamp: number
}

export function CampaignWorkspace() {
  const { campaign, updateBudget } = useCampaignContext()
  const { goalState } = useGoal()
  const { adContent, resetAdPreview, selectedImageIndex, selectedCreativeVariation, setIsPublished } = useAdPreview()
  const { clearLocations, locationState } = useLocation()
  const { resetAudience, audienceState } = useAudience()
  const { adCopyState, getSelectedCopy, resetAdCopy } = useAdCopy()
  const { budgetState, isComplete: isBudgetComplete } = useBudget()
  const { metaStatus, paymentStatus } = useMetaConnection()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const campaignId = campaign?.id ?? ""
  const { ads, refreshAds, updateAdStatus } = useCampaignAds(campaignId)
  
  // State for save success notification
  const [saveSuccessState, setSaveSuccessState] = useState<SaveSuccessState | null>(null)
  
  // State for publish dialog in edit mode
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)
  
  // State for unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showCancelNewAdDialog, setShowCancelNewAdDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  
  // Listen for save complete events
  useEffect(() => {
    const handleSaveComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{
        campaignId: string
        campaignName: string
        isEdit: boolean
        adId: string
        timestamp: number
      }>
      
      // Only handle events for this campaign
      if (customEvent.detail.campaignId !== campaignId) return
      
      console.log('[CampaignWorkspace] Save complete event received:', customEvent.detail)
      
      // Refresh ads data
      void refreshAds()
      
      // Switch to all-ads view (no query params = all-ads grid)
      router.replace(pathname)
      
      // Store success state for modal
      setSaveSuccessState({
        campaignName: customEvent.detail.campaignName,
        isEdit: customEvent.detail.isEdit,
        adId: customEvent.detail.adId,
        timestamp: customEvent.detail.timestamp
      })
    }
    
    window.addEventListener('campaign:save-complete', handleSaveComplete)
    return () => {
      window.removeEventListener('campaign:save-complete', handleSaveComplete)
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
  
  // Show all-ads grid when:
  // 1. No explicit view parameter in URL AND
  // 2. Campaign has at least one ad in database
  const shouldShowAllAds = !viewParam && ads.length > 0
  const effectiveMode: WorkspaceMode = shouldShowAllAds ? 'all-ads' : (viewParam || 'build')
  
  // If we're in results mode but don't have the specific ad yet, show all-ads instead
  const shouldFallbackToAllAds = effectiveMode === 'results' && !currentAdId && ads.length > 0

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

      const normalizedStatus: 'draft' | 'active' | 'paused' | 'archived' =
        metaAdId ? (ad.status as 'draft' | 'active' | 'paused' | 'archived') : 'draft'

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
    const hasAudienceWork = audienceState.status === 'completed'
    const hasCopyWork = (adCopyState.customCopyVariations?.length ?? 0) > 0
    
    return hasCreativeWork || hasLocationWork || hasAudienceWork || hasCopyWork
  }, [effectiveMode, adContent, locationState.locations, audienceState.status, adCopyState.customCopyVariations])

  // Track unsaved changes in edit mode and progress in build mode
  useEffect(() => {
    if (effectiveMode === 'edit' && currentAdId) {
      // Mark as having unsaved changes when in edit mode
      // This will be reset when Save & Publish is successful
      setHasUnsavedChanges(true)
    } else if (effectiveMode === 'build' && hasPublishedAds) {
      // In build mode with existing ads, track if there's any progress
      setHasUnsavedChanges(hasBuildProgress)
    } else {
      setHasUnsavedChanges(false)
    }
  }, [effectiveMode, currentAdId, hasPublishedAds, hasBuildProgress])

  // Update URL when mode changes
  const setWorkspaceMode = useCallback((mode: WorkspaceMode, adId?: string) => {
    const params = new URLSearchParams()
    params.set("view", mode)
    if (adId) params.set("adId", adId)
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router])

  // Simulated metrics for demonstration
  // TODO: Fetch real metrics from API
  const mockMetrics: AdMetrics = {
    impressions: 1234,
    reach: 987,
    clicks: 45,
    leads: goalState.selectedGoal === 'leads' ? 5 : undefined,
    cpc: 0.78,
    ctr: 3.64,
    cpl: goalState.selectedGoal === 'leads' ? 7.80 : undefined,
    spend: 35.10,
    last_updated: new Date().toISOString(),
  }

  // Simulated variant for demonstration
  const mockVariant: AdVariant = {
    id: 'variant-1',
    campaign_id: campaignId,
    name: campaign?.name || 'Ad Variant',
    status: 'active',
    variant_type: 'original',
    creative_data: {
      headline: adContent?.headline || '',
      body: adContent?.body || '',
      cta: adContent?.cta || 'Learn More',
      imageUrl: adContent?.imageUrl,
      imageVariations: adContent?.imageVariations,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  }

  // Simulated lead form info for leads campaigns
  const mockLeadFormInfo: LeadFormInfo | undefined = goalState.selectedGoal === 'leads' ? {
    form_id: 'form-1',
    form_name: 'Get Free Quote',
    is_connected: true,
    lead_count: 5,
    recent_leads: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        submitted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      },
      {
        id: '2',
        name: 'Sarah Miller',
        email: 'sarah@example.com',
        submitted_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      },
    ],
  } : undefined

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
    console.log('[CampaignWorkspace] Creating new ad - resetting creative state')
    
    // Step 1: Create draft ad record in database
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/ads/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (!response.ok) {
        console.error('[CampaignWorkspace] Failed to create draft ad')
        toast.error('Failed to create new ad')
        return
      }
      
      const { ad } = await response.json()
      const newAdId = ad.id
      console.log('[CampaignWorkspace] ✅ Created draft ad:', newAdId)
      
      // Step 2: Reset all creative-related contexts
      resetAdPreview()
      resetAdCopy()
      clearLocations()
      resetAudience()
      
      // Step 3: Generate new conversation ID to force AI chat reset
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Step 4: Clear session storage for stepper to force step 0
      if (campaignId) {
        sessionStorage.removeItem(`campaign:${campaignId}:lastStepId`)
        sessionStorage.removeItem(`auto-submitted-${campaignId}`)
        sessionStorage.removeItem(`new-ad-auto-submitted-${campaignId}`)
        console.log('[CampaignWorkspace] Cleared session storage for campaign:', campaignId)
      }
      
      // Step 5: Navigate to build mode with adId and newAd flag
      // Goal and budget are locked (inherited from campaign)
      // User can only modify creative, audience, and location
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
      
      console.log('[CampaignWorkspace] Navigating to build mode with adId:', newAdId)
      router.replace(`${pathname}?${params.toString()}`)
    } catch (error) {
      console.error('[CampaignWorkspace] Error creating draft ad:', error)
      toast.error('Failed to create new ad')
    }
  }, [campaignId, effectiveMode, pathname, router, resetAdPreview, resetAdCopy, clearLocations, resetAudience])

  const handleViewAllAds = useCallback(() => {
    setWorkspaceMode('all-ads')
  }, [setWorkspaceMode])

  const handleViewAd = useCallback((adId: string) => {
    setWorkspaceMode('results', adId)
  }, [setWorkspaceMode])

  const handleEditAd = useCallback((adId: string) => {
    setWorkspaceMode('edit', adId)
  }, [setWorkspaceMode])

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
    try {
      console.log('[CampaignWorkspace] Publishing ad:', adId)
      
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}/publish`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('[CampaignWorkspace] Failed to publish ad:', errorData)
        toast.error(errorData.error || 'Failed to publish ad')
        return
      }
      
      const { ad } = await response.json()
      console.log('[CampaignWorkspace] Ad published successfully:', adId)
      
      // Show success toast
      toast.success('Ad published successfully!')
      
      // Refresh ads list to update status
      await refreshAds()
      
      // Stay on all-ads view to show the published ad
    } catch (error) {
      console.error('[CampaignWorkspace] Error publishing ad:', error)
      toast.error('Failed to publish ad')
    }
  }, [campaignId, refreshAds])

  const handleDeleteAd = useCallback(async (adId: string) => {
    try {
      console.log('[CampaignWorkspace] Deleting ad:', adId)
      
      const response = await fetch(`/api/campaigns/${campaignId}/ads/${adId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        console.error('[CampaignWorkspace] Failed to delete ad:', await response.text())
        // TODO: Show error toast
        return
      }
      
      console.log('[CampaignWorkspace] Ad deleted successfully:', adId)
      
      // Refresh ads list to remove deleted ad
      await refreshAds()
      
      // If we're viewing the deleted ad, go back to all-ads grid
      if (currentAdId === adId) {
        setWorkspaceMode('all-ads')
      }
    } catch (error) {
      console.error('[CampaignWorkspace] Error deleting ad:', error)
      // TODO: Show error toast
    }
  }, [campaignId, currentAdId, refreshAds, setWorkspaceMode])

  const handleCreateABTest = useCallback((adId: string) => {
    setWorkspaceMode('ab-test-builder', adId)
  }, [setWorkspaceMode])

  // Handle Save & Publish action from header
  const handleSaveAndPublish = useCallback(async () => {
    if (!campaign?.id || !currentAdId || isPublishing) return
    
    // Validate all sections
    const validationState = {
      selectedImageIndex,
      adCopyStatus: adCopyState.status,
      locationStatus: locationState.status,
      audienceStatus: audienceState.status,
      goalStatus: goalState.status,
      isMetaConnectionComplete,
      hasPaymentMethod,
      isBudgetComplete: isBudgetComplete(),
    }
    
    const validation = validateAdForPublish(validationState)
    
    if (!validation.isValid) {
      toast.error(formatValidationError(validation))
      return
    }
    
    // Open publish dialog
    setIsPublishing(true)
    setPublishDialogOpen(true)
  }, [
    campaign?.id,
    currentAdId,
    isPublishing,
    selectedImageIndex,
    adCopyState.status,
    locationState.status,
    audienceState.status,
    goalState.status,
    isMetaConnectionComplete,
    hasPaymentMethod,
    isBudgetComplete,
  ])
  
  // Handle publish complete
  const handlePublishComplete = useCallback(async () => {
    if (!campaign?.id || !currentAdId) return
    
    try {
      // Import the snapshot builder dynamically
      const { buildAdSnapshot, validateAdSnapshot } = await import('@/lib/services/ad-snapshot-builder')
      
      // Build complete snapshot from wizard contexts
      const snapshot = buildAdSnapshot({
        adPreview: {
          adContent,
          selectedImageIndex,
          selectedCreativeVariation,
        },
        adCopy: adCopyState,
        location: locationState,
        audience: audienceState,
        goal: goalState,
        budget: budgetState,
      })
      
      // Validate snapshot before submitting
      const validation = validateAdSnapshot(snapshot)
      if (!validation.isValid) {
        console.error('Snapshot validation failed:', validation.errors)
        toast.error(`Cannot publish: ${validation.errors.join(', ')}`)
        setIsPublishing(false)
        return
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Snapshot warnings:', validation.warnings)
      }
      
      // Gather the finalized ad data from snapshot - use canonical copy source
      const selectedCopy = getSelectedCopy()
      
      const selectedImageUrl = selectedImageIndex !== null && adContent?.imageVariations?.[selectedImageIndex]
        ? adContent.imageVariations[selectedImageIndex]
        : adContent?.imageUrl || adContent?.imageVariations?.[0]
      
      // Prepare the ad data for persistence
      const adData = {
        name: `${campaign.name} - Ad ${new Date().toLocaleDateString()}`,
        status: 'active',
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
        meta_ad_id: null, // Will be set when actually published to Meta
      }
      
      console.log('📸 Validated snapshot (used for deriving data):', {
        hasSnapshot: !!snapshot,
        creative: snapshot.creative.selectedImageIndex,
        copy: {
          headline: snapshot.copy.headline,
          primaryText: snapshot.copy.primaryText?.substring(0, 50) + '...',
        },
        locations: snapshot.location.locations.length,
        goal: snapshot.goal.type,
      })
      
      console.log('📦 Ad data being sent to API (UPDATE):', {
        adId: currentAdId,
        name: adData.name,
        status: adData.status,
      })
      
      // Update the existing ad in Supabase
      const response = await fetch(`/api/campaigns/${campaign.id}/ads/${currentAdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adData),
      })
      
      if (!response.ok) {
        console.error('Failed to update ad:', await response.text())
        toast.error('Failed to save changes')
        setIsPublishing(false)
        return
      }
      
      const { ad } = await response.json()
      console.log(`✅ Ad updated:`, ad.id)
      
      // Mark as published in context and clear unsaved changes
      setIsPublished(true)
      setIsPublishing(false)
      setHasUnsavedChanges(false)
      
      // Close the dialog immediately so navigation isn't blocked
      setPublishDialogOpen(false)
      
      // Dispatch custom event to notify campaign workspace
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campaign:save-complete', {
          detail: {
            campaignId: campaign.id,
            campaignName: campaign.name,
            isEdit: true,
            adId: ad.id,
            timestamp: Date.now()
          }
        }))
      }
    } catch (error) {
      console.error('Error in handlePublishComplete:', error)
      toast.error('Failed to save changes')
      setIsPublishing(false)
    }
  }, [
    campaign?.id,
    campaign?.name,
    currentAdId,
    adContent,
    selectedImageIndex,
    selectedCreativeVariation,
    adCopyState,
    locationState,
    audienceState,
    goalState,
    budgetState,
    getSelectedCopy,
    setIsPublished,
  ])
  
  const handlePublishDialogClose = useCallback((open: boolean) => {
    setPublishDialogOpen(open)
    if (!open) {
      // User closed dialog before completion
      setIsPublishing(false)
    }
  }, [])
  
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
  // Show back button in all modes except all-ads, with special handling for build mode
  const showBackButton = (() => {
    // Never show in all-ads mode (it's the home base)
    if (effectiveMode === 'all-ads') return false
    
    // Always show in results, edit, and ab-test-builder modes  
    if (effectiveMode === 'results' || effectiveMode === 'edit' || effectiveMode === 'ab-test-builder') {
      return true
    }
    
    // Build mode: show button if we have published ads OR variant param indicates we came from all-ads
    if (effectiveMode === 'build') {
      return hasPublishedAds || isCreatingVariant
    }
    
    return false
  })()

  // Get current variant for results/edit modes
  const getCurrentVariant = (): AdVariant | null => {
    if (!currentAdId) return null
    
    // Find the ad by ID from our converted ads
    const ad = convertedAds.find(a => a.id === currentAdId)
    if (ad) return ad
    
    // Fallback to mock if not found (shouldn't happen in normal flow)
    console.warn(`Ad ${currentAdId} not found in converted ads, using mock`)
    return mockVariant
  }

  // Get current metrics
  const getCurrentMetrics = (): AdMetrics => {
    if (!currentAdId) return mockMetrics
    
    // Find the ad by ID and return its metrics
    const ad = convertedAds.find(a => a.id === currentAdId)
    if (ad?.metrics_snapshot) {
      return ad.metrics_snapshot
    }
    
    // Fallback to mock metrics
    return mockMetrics
  }

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
        onSaveAndPublish={effectiveMode === 'edit' ? handleSaveAndPublish : undefined}
        isSaveAndPublishDisabled={isPublishing}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden h-full min-h-0">
        {effectiveMode === 'build' && (
          <PreviewPanel />
        )}

        {(effectiveMode === 'results' || shouldFallbackToAllAds) && !shouldFallbackToAllAds && currentAdId && (() => {
          const currentVariant = getCurrentVariant()
          if (!currentVariant) {
            return (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading ad...</p>
              </div>
            )
          }
          return (
            <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
              <ResultsPanel
                variant={currentVariant}
                metrics={getCurrentMetrics()}
                onEdit={() => handleEditAd(currentAdId!)}
                onPause={async () => {
                  const success = await handlePauseAd(currentAdId!)
                  if (success) {
                    // Navigate to all-ads view after successful pause
                    handleViewAllAds()
                  }
                  return success
                }}
                onResume={async () => {
                  const success = await handleResumeAd(currentAdId!)
                  if (success) {
                    // Navigate to all-ads view after successful resume
                    handleViewAllAds()
                  }
                  return success
                }}
                onCreateABTest={() => handleCreateABTest(currentAdId!)}
                leadFormInfo={mockLeadFormInfo}
              />
            </div>
          )
        })()}

        {(effectiveMode === 'all-ads' || shouldFallbackToAllAds) && (
          <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
            <AllAdsGrid
              ads={convertedAds}
              onViewAd={handleViewAd}
              onEditAd={handleEditAd}
              onPublishAd={handlePublishAd}
              onPauseAd={handlePauseAd}
              onResumeAd={handleResumeAd}
              onCreateABTest={handleCreateABTest}
              onDeleteAd={handleDeleteAd}
              saveSuccessState={saveSuccessState}
              onClearSuccessState={() => setSaveSuccessState(null)}
            />
          </div>
        )}

        {effectiveMode === 'edit' && (
          <PreviewPanel />
        )}

        {effectiveMode === 'ab-test-builder' && (() => {
          const currentVariant = getCurrentVariant()
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
                onCancel={() => setWorkspaceMode('results', currentAdId || undefined)}
                onComplete={() => {
                  // TODO: Handle test creation
                  setWorkspaceMode('results', currentAdId || undefined)
                }}
              />
            </div>
          )
        })()}
      </div>
      
      {/* Publish Flow Dialog for Edit Mode */}
      {effectiveMode === 'edit' && (
        <PublishFlowDialog
          open={publishDialogOpen}
          onOpenChange={handlePublishDialogClose}
          campaignName={campaign?.name || "your ad"}
          isEditMode={true}
          onComplete={handlePublishComplete}
        />
      )}
      
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
                setShowCancelNewAdDialog(false)
                setHasUnsavedChanges(false)
                
                // Delete draft ad if it exists
                const draftAdId = searchParams.get('adId')
                if (draftAdId && campaignId) {
                  try {
                    await fetch(`/api/campaigns/${campaignId}/ads/${draftAdId}`, {
                      method: 'DELETE'
                    })
                    console.log('[CampaignWorkspace] Deleted draft ad:', draftAdId)
                  } catch (error) {
                    console.error('[CampaignWorkspace] Error deleting draft ad:', error)
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
