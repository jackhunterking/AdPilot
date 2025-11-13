/**
 * Feature: Campaign Results Workspace
 * Purpose: Comprehensive metrics dashboard with KPI table and lead manager for viewing campaign results.
 * References:
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 *  - Vercel AI SDK V5: https://ai-sdk.dev/docs/introduction
 */

"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { KPIMetricsTable } from "@/components/results/kpi-metrics-table"
import { LeadsTable } from "@/components/results/leads-table"
import { CampaignEditor } from "@/components/results/campaign-editor"
import { type CampaignMetricsSnapshot, type MetricsRangeKey } from "@/lib/meta/insights"
import type { KPIMetricsRow } from "@/lib/types/workspace"

interface ResultsPanelProps {
  isEnabled: boolean
}

const RANGE_OPTIONS: Array<{ label: string; value: MetricsRangeKey }> = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Lifetime", value: "lifetime" },
]

function deriveGoalLabel(goal: string | null | undefined): string {
  switch ((goal || "").toLowerCase()) {
    case "leads":
      return "leads"
    case "calls":
      return "calls"
    case "website-visits":
      return "website-visits"
    default:
      return "unknown"
  }
}

function convertToKPIMetricsRow(metrics: CampaignMetricsSnapshot | null): KPIMetricsRow | null {
  if (!metrics) return null
  
  return {
    impressions: metrics.impressions,
    reach: metrics.reach,
    clicks: metrics.clicks,
    ctr: metrics.ctr,
    cpc: metrics.cpc,
    cpm: metrics.cpm,
    spend: metrics.spend,
    results: metrics.results,
    cost_per_result: metrics.cost_per_result,
  }
}

export function ResultsPanel({ isEnabled }: ResultsPanelProps) {
  const { campaign } = useCampaignContext()
  const campaignId = campaign?.id ?? null
  const goalState = campaign?.campaign_states?.goal_data as { selectedGoal?: string } | undefined
  const goal = deriveGoalLabel(goalState?.selectedGoal ?? null)
  const currencyCode = campaign?.campaign_states?.budget_data && typeof campaign.campaign_states.budget_data === "object"
    ? (campaign.campaign_states.budget_data as { currencyCode?: string }).currencyCode ?? "USD"
    : "USD"

  const [range, setRange] = useState<MetricsRangeKey>("7d")
  const [metrics, setMetrics] = useState<CampaignMetricsSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const loadMetrics = useCallback(async (targetRange: MetricsRangeKey) => {
    if (!campaignId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/meta/metrics?campaignId=${encodeURIComponent(campaignId)}&dateRange=${targetRange}`, {
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load metrics")
      }
      setMetrics(json.metrics ?? null)
      setLastSyncAt(json.lastSyncAt ?? null)
    } catch (err) {
      console.error("[ResultsPanel] loadMetrics error", err)
      setError(err instanceof Error ? err.message : "Failed to load metrics")
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  const refreshMetrics = useCallback(async () => {
    if (!campaignId) return
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`/api/meta/metrics/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, range }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to refresh metrics")
      }
      setMetrics(json.metrics ?? null)
      setLastSyncAt(json.lastSyncAt ?? null)
    } catch (err) {
      console.error("[ResultsPanel] refresh error", err)
      setError(err instanceof Error ? err.message : "Failed to refresh metrics")
    } finally {
      setRefreshing(false)
    }
  }, [campaignId, range])

  useEffect(() => {
    if (!isEnabled || !campaignId) return
    loadMetrics(range)
  }, [campaignId, isEnabled, loadMetrics, range])

  if (!isEnabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
        <Badge variant="outline" className="px-3 py-1 text-xs uppercase tracking-wide">
          Results locked
        </Badge>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-semibold">Publish your campaign to see results</h2>
          <p className="text-muted-foreground">
            Once you launch your campaign, this space will show how many people you reach, how much you spend, and plain-language tips from your AI co-pilot.
          </p>
        </div>
      </div>
    )
  }

  if (!campaignId) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-sm text-muted-foreground">Campaign not loaded.</p>
      </div>
    )
  }

  const kpiMetrics = convertToKPIMetricsRow(metrics)
  const isLeadGoal = goal === "leads"

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-muted/20 px-6 py-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive performance metrics for your campaign.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(value) => setRange(value as MetricsRangeKey)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={refreshMetrics} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh metrics"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Metrics Table */}
        <KPIMetricsTable
          metrics={kpiMetrics}
          loading={loading}
          error={error}
          currency={currencyCode}
          onRefresh={refreshMetrics}
          lastSyncAt={lastSyncAt}
        />

        {/* Leads Table (only for lead campaigns) */}
        {isLeadGoal && (
          <LeadsTable campaignId={campaignId} onRefresh={refreshMetrics} />
        )}

        {/* Campaign Editor */}
        <CampaignEditor />
      </div>
    </div>
  )
}
