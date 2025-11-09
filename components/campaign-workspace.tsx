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
import { AllAdsGrid } from "@/components/all-ads-grid"
import { ABTestBuilder } from "@/components/ab-test/ab-test-builder"
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
      // Try to use setup_snapshot first, fall back to legacy fields
      const snapshot = ad.setup_snapshot as Record<string, unknown> | null
      
      let creative_data: AdVariant['creative_data']
      
      if (snapshot?.creative) {
        const creativeSnapshot = snapshot.creative as {
          imageUrl?: string
          imageVariations?: string[]
          selectedImageIndex?: number | null
        }
        const copySnapshot = snapshot.copy as {
          headline?: string
          primaryText?: string
          description?: string
          cta?: string
        }
        
        // Build creative_data from snapshot
        const selectedIndex = creativeSnapshot.selectedImageIndex ?? 0
        creative_data = {
          imageUrl: creativeSnapshot.imageVariations?.[selectedIndex] || creativeSnapshot.imageUrl,
          imageVariations: creativeSnapshot.imageVariations,
          headline: copySnapshot?.headline || '',
          body: copySnapshot?.primaryText || '',
          primaryText: copySnapshot?.primaryText,
          description: copySnapshot?.description,
          cta: copySnapshot?.cta || 'Learn More',
        }
      } else {
        // Fallback to legacy fields
        creative_data = (ad.creative_data as AdVariant['creative_data']) || {
          headline: '',
          body: '',
          cta: '',
        }
      }
      
      return {
        id: ad.id,
        campaign_id: ad.campaign_id,
        name: ad.name,
        status: ad.status as 'draft' | 'active' | 'paused' | 'archived',
        variant_type: 'original' as const,
        creative_data,
        metrics_snapshot: ad.metrics_snapshot as AdVariant['metrics_snapshot'],
        meta_ad_id: ad.meta_ad_id || undefined,
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
    // When creating a new ad in an existing campaign:
    // - Goal and budget are locked (inherited from campaign)
    // - User can only modify creative, audience, and location
    
    // Navigate to build mode with variant flag if we have published ads
    if (hasPublishedAds) {
      // Adding variant=true to URL to signal PreviewPanel to hide goal/budget steps
      const params = new URLSearchParams()
      params.set("view", "build")
      params.set("variant", "true")
      router.replace(`${pathname}?${params.toString()}`)
    } else {
      setWorkspaceMode('build')
    }
  }, [hasPublishedAds, pathname, router, setWorkspaceMode])

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
        totalAds={effectiveMode === 'all-ads' ? convertedAds.length : undefined}
        hasPublishedAds={hasPublishedAds}
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
            <div className="flex flex-1 h-full p-6">
              <ResultsPanel
                variant={currentVariant}
                metrics={getCurrentMetrics()}
                onEdit={() => handleEditAd(currentAdId!)}
                onPause={() => handlePauseAd(currentAdId!)}
                onCreateABTest={() => handleCreateABTest(currentAdId!)}
                onViewAllAds={handleViewAllAds}
                leadFormInfo={mockLeadFormInfo}
              />
            </div>
          )
        })()}

        {(effectiveMode === 'all-ads' || shouldFallbackToAllAds) && (
          <AllAdsGrid
            ads={convertedAds}
            onViewAd={handleViewAd}
            onEditAd={handleEditAd}
            onPauseAd={handlePauseAd}
            onResumeAd={handleResumeAd}
            onCreateABTest={handleCreateABTest}
          />
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
            <ABTestBuilder
              campaign_id={campaignId}
              current_variant={currentVariant}
              onCancel={() => setWorkspaceMode('results', currentAdId || undefined)}
              onComplete={(test) => {
                // TODO: Handle test creation
                setWorkspaceMode('results', currentAdId || undefined)
              }}
            />
          )
        })()}
      </div>
    </div>
  )
}
