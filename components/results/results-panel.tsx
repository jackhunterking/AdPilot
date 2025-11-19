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
import { UnpublishedWarningBanner } from "@/components/results/unpublished-warning-banner"
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
  // Goal now stored in campaign.initial_goal (campaign_states table removed)
  const goal = deriveGoalLabel(campaign?.initial_goal ?? null)
  const currencyCode = campaign?.currency_code ?? "USD"

  const [range, setRange] = useState<MetricsRangeKey>("7d")
  const [metrics, setMetrics] = useState<CampaignMetricsSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const loadMetrics = useCallback(async (targetRange: MetricsRangeKey) => {
    if (!campaignId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/meta/metrics?campaignId=${encodeURIComponent(campaignId)}&dateRange=${targetRange}`, {
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
    setError(null)
    try {
      // TODO: Migrate to v1 API - metrics refresh endpoint not yet implemented
      // For now, just refetch metrics with no-cache
      const res = await fetch(`/api/v1/meta/metrics?campaignId=${encodeURIComponent(campaignId)}&dateRange=${range}`, {
        method: "GET",
        cache: "no-store"
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
    }
  }, [campaignId, range])

  useEffect(() => {
    if (!campaignId) return
    // Only fetch metrics if the campaign is published (isEnabled)
    if (isEnabled) {
      loadMetrics(range)
    }
  }, [campaignId, isEnabled, loadMetrics, range])

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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-card/50 px-6 py-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">
            View performance metrics and manage your campaign results.
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
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Warning banner for unpublished campaigns */}
        {!isEnabled && <UnpublishedWarningBanner />}

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
      </div>
    </div>
  )
}
