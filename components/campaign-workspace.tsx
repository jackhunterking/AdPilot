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
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useCampaignAds } from "@/lib/hooks/use-campaign-ads"
import { useGoal } from "@/lib/context/goal-context"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { metaStorage } from "@/lib/meta/storage"
import type { WorkspaceMode, CampaignStatus, AdVariant, AdMetrics, LeadFormInfo } from "@/lib/types/workspace"

interface SaveSuccessState {
  campaignName: string
  isEdit: boolean
  adId: string
  timestamp: number
}

export function CampaignWorkspace() {
  const { campaign, updateBudget } = useCampaignContext()
  const { goalState } = useGoal()
  const { adContent, resetAdPreview } = useAdPreview()
  const { clearLocations } = useLocation()
  const { resetAudience } = useAudience()
  const { metaStatus, paymentStatus } = useMetaConnection()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const campaignId = campaign?.id ?? ""
  const { ads, refreshAds, updateAdStatus } = useCampaignAds(campaignId)
  
  // State for save success notification
  const [saveSuccessState, setSaveSuccessState] = useState<SaveSuccessState | null>(null)
  
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
  
  // Get view mode from URL
  const viewParam = searchParams.get("view") as WorkspaceMode | null
  const currentAdId = searchParams.get("adId")
  
  // Show all-ads grid when:
  // 1. No explicit view parameter in URL AND
  // 2. Campaign has at least one ad in database
  const shouldShowAllAds = !viewParam && ads.length > 0
  const effectiveMode: WorkspaceMode = shouldShowAllAds ? 'all-ads' : (viewParam || 'build')
  
  // If we're in results mode but don't have the specific ad yet, show all-ads instead
  const shouldFallbackToAllAds = effectiveMode === 'results' && !currentAdId && ads.length > 0

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

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (effectiveMode === 'results' || effectiveMode === 'edit' || effectiveMode === 'ab-test-builder') {
      // All these modes navigate to all-ads grid
      setWorkspaceMode('all-ads')
    } else if (effectiveMode === 'build') {
      // Only go to all-ads if we have published ads, otherwise do nothing (button should be hidden)
      if (hasPublishedAds) {
        setWorkspaceMode('all-ads')
      }
    }
  }, [effectiveMode, hasPublishedAds, setWorkspaceMode])

  const handleNewAd = useCallback(() => {
    console.log('[CampaignWorkspace] Creating new ad - resetting creative state')
    
    // Reset all creative-related contexts
    resetAdPreview()
    clearLocations()
    resetAudience()
    
    // Generate new conversation ID to force AI chat reset
    const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Clear the auto-submit flag so AI will proactively ask about creative
    if (campaignId) {
      sessionStorage.removeItem(`auto-submitted-${campaignId}`)
      console.log('[CampaignWorkspace] Cleared auto-submit flag for campaign:', campaignId)
    }
    
    // Navigate to build mode with new conversation ID
    // Goal and budget are locked (inherited from campaign)
    // User can only modify creative, audience, and location
    const params = new URLSearchParams()
    params.set("view", "build")
    params.set("conversationId", newConversationId)
    
    if (hasPublishedAds) {
      // Adding variant=true to URL to signal PreviewPanel to hide goal/budget steps
      params.set("variant", "true")
    }
    
    console.log('[CampaignWorkspace] Navigating to build mode with conversation ID:', newConversationId)
    router.replace(`${pathname}?${params.toString()}`)
  }, [campaignId, hasPublishedAds, pathname, router, resetAdPreview, clearLocations, resetAudience])

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

  // Determine header props
  // Always show New Ad button in results and all-ads modes
  const showNewAdButton = effectiveMode === 'results' || effectiveMode === 'all-ads'
  // Show back button in all modes EXCEPT:
  // 1. all-ads mode (it's the home base)
  // 2. build mode when no published ads exist (first ad being built)
  const showBackButton = effectiveMode !== 'all-ads' && !(effectiveMode === 'build' && !hasPublishedAds)

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
    </div>
  )
}
