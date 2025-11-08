"use client"

import { useCallback, useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PreviewPanel } from "@/components/preview-panel"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { cn } from "@/lib/utils"
import { ResultsPanel } from "@/components/results/results-panel"

export type WorkspaceTab = typeof TAB_SETUP | typeof TAB_RESULTS

const TAB_SETUP = "setup"
const TAB_RESULTS = "results"

type CampaignWorkspaceProps = {
  activeTab: WorkspaceTab
  onTabChange: (tab: WorkspaceTab) => void
}

function computeDefaultTab(paramsTab: string | null, storageTab: string | null, resultsEnabled: boolean): WorkspaceTab {
  const candidate = paramsTab || storageTab || TAB_SETUP
  if (candidate === TAB_RESULTS && resultsEnabled) {
    return TAB_RESULTS
  }
  return TAB_SETUP
}

export function CampaignWorkspace({ activeTab, onTabChange }: CampaignWorkspaceProps) {
  const { campaign } = useCampaignContext()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const resultsEnabled = useMemo(() => {
    const status = campaign?.published_status || ""
    return status === "active" || status === "paused"
  }, [campaign?.published_status])

  const campaignId = campaign?.id ?? ""
  const storageKey = campaignId ? `campaign-workspace-tab:${campaignId}` : null
  const paramsTab = searchParams.get("tab")

  const updateQueryString = useCallback(
    (tab: WorkspaceTab) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", tab)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    const stored = storageKey && typeof window !== "undefined"
      ? window.localStorage.getItem(storageKey)
      : null
    const nextTab = computeDefaultTab(paramsTab, stored, resultsEnabled)
    if (nextTab !== activeTab) {
      onTabChange(nextTab)
      updateQueryString(nextTab)
    }
  }, [activeTab, onTabChange, paramsTab, resultsEnabled, storageKey, updateQueryString])

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return
    window.localStorage.setItem(storageKey, activeTab)
  }, [activeTab, storageKey])

  useEffect(() => {
    updateQueryString(activeTab)
  }, [activeTab, updateQueryString])

  const handleTabChange = useCallback(
    (value: string) => {
      if (value === TAB_RESULTS && !resultsEnabled) {
        return
      }
      const nextTab = value === TAB_RESULTS ? TAB_RESULTS : TAB_SETUP
      onTabChange(nextTab)
    },
    [onTabChange, resultsEnabled],
  )

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

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 flex-col overflow-hidden h-full min-h-0">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-background/80 px-6 py-3">
        <TabsList className="w-auto">
          <TabsTrigger value={TAB_SETUP}>Setup</TabsTrigger>
          <TabsTrigger value={TAB_RESULTS} disabled={!resultsEnabled} className={cn(!resultsEnabled && "cursor-not-allowed opacity-60")}>Results</TabsTrigger>
        </TabsList>
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
      <TabsContent value={TAB_SETUP} className="flex-1 overflow-hidden h-full min-h-0">
        <PreviewPanel />
      </TabsContent>
      <TabsContent value={TAB_RESULTS} className="flex-1 overflow-hidden h-full min-h-0">
        <ResultsPanel isEnabled={resultsEnabled} />
      </TabsContent>
    </Tabs>
  )
}
