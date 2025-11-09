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

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { PreviewPanel } from "@/components/preview-panel"
import { ResultsPanel } from "@/components/results-panel"
import { WorkspaceHeader } from "@/components/workspace-header"
import { AllAdsView } from "@/components/all-ads-view"
import { ABTestBuilder } from "@/components/ab-test/ab-test-builder"
import AIChat from "@/components/ai-chat"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useCampaignAds } from "@/lib/hooks/use-campaign-ads"
import { useGoal } from "@/lib/context/goal-context"
import type { WorkspaceMode, CampaignStatus, AdVariant, AdMetrics, LeadFormInfo } from "@/lib/types/workspace"

export function CampaignWorkspace() {
  const { campaign } = useCampaignContext()
  const { goalState } = useGoal()
  const { isPublished, adContent } = useAdPreview()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const campaignId = campaign?.id ?? ""
  const { ads, loading: adsLoading, refreshAds } = useCampaignAds(campaignId)
  
  // Get view mode from URL
  const viewParam = searchParams.get("view") as WorkspaceMode | null
  const currentAdId = searchParams.get("adId")
  
  // Default to build mode on initial entry
  const workspaceMode: WorkspaceMode = viewParam || 'build'
  
  // After first publish, default to results mode
  const shouldShowResults = isPublished && !viewParam
  const effectiveMode = shouldShowResults ? 'results' : workspaceMode

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

  // Convert CampaignAd to AdVariant
  const convertedAds: AdVariant[] = useMemo(() => {
    return ads.map(ad => ({
      id: ad.id,
      campaign_id: ad.campaign_id,
      name: ad.name,
      status: ad.status as 'draft' | 'active' | 'paused' | 'archived',
      variant_type: 'original' as const,
      creative_data: (ad.creative_data as AdVariant['creative_data']) || {
        headline: '',
        body: '',
        cta: '',
      },
      metrics_snapshot: ad.metrics_snapshot as AdVariant['metrics_snapshot'],
      meta_ad_id: ad.meta_ad_id || undefined,
      created_at: ad.created_at,
      updated_at: ad.updated_at,
    }))
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
    // Create new ad, go to build mode
    // TODO: API call to create ad variant
    setWorkspaceMode('build')
  }, [setWorkspaceMode])

  const handleViewAllAds = useCallback(() => {
    setWorkspaceMode('all-ads')
  }, [setWorkspaceMode])

  const handleViewAd = useCallback((adId: string) => {
    setWorkspaceMode('results', adId)
  }, [setWorkspaceMode])

  const handleEditAd = useCallback((adId: string) => {
    setWorkspaceMode('edit', adId)
  }, [setWorkspaceMode])

  const handlePauseAd = useCallback((adId: string) => {
    // TODO: API call to pause ad
    console.log('Pause ad:', adId)
  }, [])

  const handleResumeAd = useCallback((adId: string) => {
    // TODO: API call to resume ad
    console.log('Resume ad:', adId)
  }, [])

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
  const getCurrentVariant = (): AdVariant => {
    // TODO: Fetch actual variant by currentAdId from API
    return mockVariant
  }

  // Get current metrics
  const getCurrentMetrics = (): AdMetrics => {
    // TODO: Fetch actual metrics by currentAdId from API
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
        totalAds={effectiveMode === 'all-ads' ? convertedAds.length : undefined}
        hasPublishedAds={hasPublishedAds}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden h-full min-h-0">
        {effectiveMode === 'build' && (
          <div className="flex flex-1 h-full">
            <div className="flex-1 border-r">
              <AIChat campaignId={campaignId} conversationId={campaignId} />
            </div>
            <div className="flex-1">
              <PreviewPanel />
            </div>
          </div>
        )}

        {effectiveMode === 'results' && (
          <div className="flex flex-1 h-full p-6">
            <ResultsPanel
              variant={getCurrentVariant()}
              metrics={getCurrentMetrics()}
              onEdit={() => handleEditAd(currentAdId!)}
              onPause={() => handlePauseAd(currentAdId!)}
              onCreateABTest={() => handleCreateABTest(currentAdId!)}
              onViewAllAds={handleViewAllAds}
              leadFormInfo={mockLeadFormInfo}
            />
          </div>
        )}

        {effectiveMode === 'all-ads' && (
          <AllAdsView
            campaignId={campaignId}
            ads={convertedAds}
            onViewAd={handleViewAd}
            onEditAd={handleEditAd}
            onPauseAd={handlePauseAd}
            onResumeAd={handleResumeAd}
            onCreateABTest={handleCreateABTest}
            conversationId={campaignId}
          />
        )}

        {effectiveMode === 'edit' && (
          <div className="flex flex-1 h-full">
            <div className="flex-1 border-r">
              <AIChat campaignId={campaignId} conversationId={campaignId} />
            </div>
            <div className="flex-1">
              <PreviewPanel />
            </div>
          </div>
        )}

        {effectiveMode === 'ab-test-builder' && (
          <ABTestBuilder
            campaign_id={campaignId}
            current_variant={getCurrentVariant()}
            onCancel={() => setWorkspaceMode('results', currentAdId || undefined)}
            onComplete={(test) => {
              // TODO: Handle test creation
              setWorkspaceMode('results', currentAdId || undefined)
            }}
          />
        )}
      </div>
    </div>
  )
}
