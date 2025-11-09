/**
 * Feature: Campaign Workspace - State-Based Routing
 * Purpose: Route between Home, Build, and View states without confusing tabs
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { PreviewPanel } from "@/components/preview-panel"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { cn } from "@/lib/utils"
import { CampaignHome } from "@/components/campaign-home"
import { AdCardsGrid } from "@/components/ad-cards-grid"
import { AdDetailDrawer } from "@/components/ad-detail-drawer"
import { useCampaignAds } from "@/lib/hooks/use-campaign-ads"
import { useGoal } from "@/lib/context/goal-context"

export type WorkspaceView = "home" | "build" | "view"

type CampaignWorkspaceProps = {
  activeView: WorkspaceView
  onViewChange: (view: WorkspaceView) => void
}

export function CampaignWorkspace({ activeView, onViewChange }: CampaignWorkspaceProps) {
  const { campaign } = useCampaignContext()
  const { goalState } = useGoal()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const campaignId = campaign?.id ?? ""
  const { ads, loading: adsLoading, refreshAds } = useCampaignAds(campaignId)
  
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null)
  const [editingAdId, setEditingAdId] = useState<string | null>(null)

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full min-h-0 relative">
      {/* Header Status Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border bg-background/80 px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewChange("home")}
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Campaign Workspace
          </button>
          {activeView !== "home" && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium capitalize">{activeView}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
              statusLabel.tone === "success" && "bg-emerald-500/10 text-emerald-600",
              statusLabel.tone === "warning" && "bg-amber-500/10 text-amber-600",
              statusLabel.tone === "destructive" && "bg-red-500/10 text-red-600",
              statusLabel.tone === "muted" && "bg-muted text-muted-foreground",
              statusLabel.tone === "default" && "bg-secondary text-secondary-foreground",
            )}
          >
            {statusLabel.label}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden h-full min-h-0">
        {activeView === "home" && (
          <CampaignHome onNavigate={handleNavigate} />
        )}
        
        {activeView === "build" && (
          <div className="flex flex-1 h-full flex-col relative min-h-0">
            <div className="flex-1 h-full overflow-hidden bg-muted border border-border rounded-tl-lg min-h-0">
              <PreviewPanel />
            </div>
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
