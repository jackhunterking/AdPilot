/**
 * Feature: Campaign Workspace - State-Based Routing
 * Purpose: Route between Build and Results modes with clean navigation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { PreviewPanel } from "@/components/preview-panel"
import { ResultsPanel } from "@/components/results-panel"
import { WorkspaceHeader } from "@/components/workspace-header"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { cn } from "@/lib/utils"
import { CampaignHome } from "@/components/campaign-home"
import { AdCardsGrid } from "@/components/ad-cards-grid"
import { AdDetailDrawer } from "@/components/ad-detail-drawer"
import { useCampaignAds } from "@/lib/hooks/use-campaign-ads"
import { useGoal } from "@/lib/context/goal-context"
import type { WorkspaceMode, CampaignStatus, AdVariant, AdMetrics, LeadFormInfo } from "@/lib/types/workspace"

export type WorkspaceView = "home" | "build" | "view"

type CampaignWorkspaceProps = {
  activeView: WorkspaceView
  onViewChange: (view: WorkspaceView) => void
}

export function CampaignWorkspace({ activeView, onViewChange }: CampaignWorkspaceProps) {
  const { campaign } = useCampaignContext()
  const { goalState } = useGoal()
  const { isPublished, adContent } = useAdPreview()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const campaignId = campaign?.id ?? ""
  const { ads, loading: adsLoading, refreshAds } = useCampaignAds(campaignId)
  
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null)
  const [editingAdId, setEditingAdId] = useState<string | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('build')
  
  // Determine if we should show results mode
  const shouldShowResults = isPublished && activeView === 'build'

  const storageKey = campaignId ? `campaign-workspace-view:${campaignId}` : null
  const paramsView = searchParams.get("view")

  const updateQueryString = useCallback(
    (view: WorkspaceView) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", view)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  // Persist view to sessionStorage
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return
    window.sessionStorage.setItem(storageKey, activeView)
  }, [activeView, storageKey])

  // Sync URL with active view
  useEffect(() => {
    updateQueryString(activeView)
  }, [activeView, updateQueryString])

  // Restore view from URL or storage on mount
  useEffect(() => {
    const stored = storageKey && typeof window !== "undefined"
      ? window.sessionStorage.getItem(storageKey)
      : null
    const initialView = (paramsView || stored || "home") as WorkspaceView
    if (initialView !== activeView && ["home", "build", "view"].includes(initialView)) {
      onViewChange(initialView)
    }
  }, []) // Only run on mount

  const statusLabel = useMemo(() => {
    const status = campaign?.published_status
    switch (status) {
      case "publishing":
        return { label: "Publishing", tone: "warning" as const }
      case "active":
        return { label: "Active", tone: "success" as const }
      case "paused":
        return { label: "Paused", tone: "default" as const }
      case "error":
        return { label: "Publish error", tone: "destructive" as const }
      default:
        return { label: "Draft", tone: "muted" as const }
    }
  }, [campaign?.published_status])

  const handleNavigate = useCallback((path: "build" | "view") => {
    onViewChange(path)
  }, [onViewChange])

  const handleViewResults = useCallback((adId: string) => {
    setSelectedAdId(adId)
  }, [])

  const handleEdit = useCallback((adId: string) => {
    setEditingAdId(adId)
    onViewChange("build")
  }, [onViewChange])

  const handleCreateVariant = useCallback(() => {
    onViewChange("build")
  }, [onViewChange])

  const handleCloseDrawer = useCallback(() => {
    setSelectedAdId(null)
  }, [])

  // Transform ads data for grid component
  const adsData = useMemo(() => {
    return ads.map(ad => ({
      id: ad.id,
      name: ad.name,
      status: ad.status,
      metrics: ad.metrics_snapshot || {},
      lastUpdated: ad.updated_at
    }))
  }, [ads])

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

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (activeView === 'build' && shouldShowResults) {
      // From results, go to home
      onViewChange('home')
      setWorkspaceMode('build')
    } else {
      router.push('/')
    }
  }, [activeView, shouldShowResults, onViewChange, router])

  // Handle new ad creation
  const handleNewAd = useCallback(() => {
    // TODO: Implement new ad variant creation flow
    console.log('Create new ad variant')
  }, [])

  // Handle edit ad
  const handleEditAd = useCallback(() => {
    setWorkspaceMode('edit')
  }, [])

  // Handle pause ad
  const handlePauseAd = useCallback(() => {
    // TODO: Implement pause functionality
    console.log('Pause ad')
  }, [])

  // Handle create A/B test
  const handleCreateABTest = useCallback(() => {
    // TODO: Implement A/B test creation flow
    console.log('Create A/B test')
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full min-h-0 relative">
      {/* Workspace Header - Only show for build/results, not home */}
      {activeView !== "home" && (
        <WorkspaceHeader
          mode={shouldShowResults ? 'results' : 'build'}
          onBack={handleBack}
          onNewAd={shouldShowResults ? handleNewAd : undefined}
          showNewAdButton={shouldShowResults}
          campaignStatus={campaign?.published_status as CampaignStatus}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden h-full min-h-0">
        {activeView === "home" && (
          <CampaignHome onNavigate={handleNavigate} />
        )}
        
        {activeView === "build" && !shouldShowResults && (
          <div className="flex flex-1 h-full flex-col relative min-h-0">
            <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
              <PreviewPanel />
            </div>
          </div>
        )}

        {activeView === "build" && shouldShowResults && (
          <div className="flex flex-1 h-full flex-col relative min-h-0 p-6">
            <ResultsPanel
              variant={mockVariant}
              metrics={mockMetrics}
              onEdit={handleEditAd}
              onPause={handlePauseAd}
              onCreateABTest={handleCreateABTest}
              leadFormInfo={mockLeadFormInfo}
            />
          </div>
        )}
        
        {activeView === "view" && (
          <>
            <AdCardsGrid
              ads={adsData}
              isLoading={adsLoading}
              onViewResults={handleViewResults}
              onEdit={handleEdit}
              onCreateVariant={handleCreateVariant}
            />
            {selectedAdId && (
              <AdDetailDrawer
                adId={selectedAdId}
                campaignId={campaignId}
                goal={goalState.selectedGoal}
                onClose={handleCloseDrawer}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
