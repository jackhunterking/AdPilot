/**
 * Feature: Campaign Results Workspace
 * Purpose: Wrap metrics dashboard, lead manager, and editing tools when viewing the Results tab.
 * References:
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 *  - Vercel AI SDK V5: https://ai-sdk.dev/docs/introduction
 */

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { LeadManager } from "@/components/results/lead-manager"
import { CampaignEditor } from "@/components/results/campaign-editor"
import { type CampaignMetricsSnapshot, type MetricsRangeKey } from "@/lib/meta/insights"

interface ResultsPanelProps {
  isEnabled: boolean
}

const RANGE_OPTIONS: Array<{ label: string; value: MetricsRangeKey }> = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Lifetime", value: "lifetime" },
]

function formatNumber(num: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num)
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: amount < 10 ? 2 : 0,
  }).format(amount)
}

function formatDateTime(value: string | null): string {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function deriveGoalLabel(goal: string | null | undefined): { noun: string; description: string } {
  switch ((goal || "").toLowerCase()) {
    case "leads":
      return { noun: "leads", description: "people who shared their details" }
    case "calls":
      return { noun: "calls", description: "people who tapped to call" }
    case "website-visits":
      return { noun: "visits", description: "people who visited your site" }
    default:
      return { noun: "actions", description: "people who interacted" }
  }
}

function getEffectivenessLabel(costPerResult: number | null): { label: string; tone: "great" | "ok" | "help" } {
  if (costPerResult == null) {
    return { label: "Still gathering data", tone: "ok" }
  }
  if (costPerResult <= 5) {
    return { label: "Great value", tone: "great" }
  }
  if (costPerResult <= 15) {
    return { label: "On track", tone: "ok" }
  }
  return { label: "Needs attention", tone: "help" }
}

export function ResultsPanel({ isEnabled }: ResultsPanelProps) {
  const { campaign } = useCampaignContext()
  const campaignId = campaign?.id ?? null
  const goalState = campaign?.campaign_states?.goal_data as { selectedGoal?: string } | undefined
  const goalLabel = deriveGoalLabel(goalState?.selectedGoal ?? null)
  const currencyCode = campaign?.campaign_states?.budget_data && typeof campaign.campaign_states.budget_data === "object"
    ? (campaign.campaign_states.budget_data as { currencyCode?: string }).currencyCode ?? "USD"
    : "USD"

  const [range, setRange] = useState<MetricsRangeKey>("7d")
  const [metrics, setMetrics] = useState<CampaignMetricsSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const effectiveness = getEffectivenessLabel(metrics?.cost_per_result ?? null)

  const metricsLoading = loading && !metrics

  const metricsCards = metrics ? (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>People reached</CardDescription>
          <CardTitle className="text-3xl font-semibold">{formatNumber(metrics.reach)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          People who saw your ad at least once during this period.
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{`Total ${goalLabel.noun}`}</CardDescription>
          <CardTitle className="text-3xl font-semibold">{formatNumber(metrics.results)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {`That's ${goalLabel.description}.`}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Amount spent</CardDescription>
          <CardTitle className="text-3xl font-semibold">{formatCurrency(metrics.spend, currencyCode)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ad spend for the selected date range.
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Cost per {goalLabel.noun.slice(0, -1)}</CardDescription>
          <CardTitle className="text-3xl font-semibold">
            {metrics.cost_per_result != null ? formatCurrency(metrics.cost_per_result, currencyCode) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {metrics.cost_per_result != null
            ? `You spend about ${formatCurrency(metrics.cost_per_result, currencyCode)} for each ${goalLabel.noun.slice(0, -1)}.`
            : "Keep the ads running a little longer to calculate cost per result."}
        </CardContent>
      </Card>
    </div>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>No results yet</CardTitle>
        <CardDescription>Give the campaign a little more time, then refresh metrics.</CardDescription>
      </CardHeader>
    </Card>
  )

  const summaryCard = (
    <Card>
      <CardHeader>
        <CardTitle>How it's going</CardTitle>
        <CardDescription>
          {metrics
            ? `${formatNumber(metrics.results)} ${goalLabel.noun} so far. ${effectiveness.label}.`
            : "We'll summarise performance once we detect activity."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {metrics ? (
          <>
            <p>
              {effectiveness.tone === "great" && "Great job! You're getting strong results for your spend."}
              {effectiveness.tone === "ok" && "You're on the right track. Let the campaign run and watch the trend."}
              {effectiveness.tone === "help" && "Results are a bit pricey. Consider refreshing your creative or narrowing the audience."}
            </p>
            <p className="text-xs">Last updated {formatDateTime(metrics.cached_at)}</p>
          </>
        ) : (
          <p>We’ll generate a plain-language summary as soon as Meta reports activity.</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-muted/20 px-6 py-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">
            Plain-language performance metrics for your campaign.
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
        {error && (
          <Card className="border-red-200 bg-red-50 text-red-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Unable to load metrics</CardTitle>
              <CardDescription className="text-red-500">
                {error}. Try refreshing metrics again in a minute.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {metricsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`metric-skeleton-${index}`}>
                <CardContent className="space-y-3 pt-6">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          metricsCards
        )}

        {summaryCard}

        <Card>
          <CardHeader>
            <CardTitle>Performance over time</CardTitle>
            <CardDescription>Daily trend charts will appear here in a later update.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-center justify-center rounded border border-dashed border-border/70 text-sm text-muted-foreground">
              Chart coming soon
            </div>
          </CardContent>
        </Card>

        <LeadManager campaignId={campaignId} goal={goalState?.selectedGoal ?? null} />
        <CampaignEditor />
      </div>
    </div>
  )
}
