/**
 * Feature: Ad Detail Drawer - Performance View
 * Purpose: Show detailed KPIs, lead inbox, and AI insights for individual ads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { X, TrendingUp, DollarSign, Users, Target, RefreshCw, Download } from "lucide-react"
import { LeadManager } from "@/components/results/lead-manager"
import { cn } from "@/lib/utils"

interface AdDetailDrawerProps {
  adId: string | null
  campaignId: string
  goal: string | null | undefined
  onClose: () => void
}

interface AdMetrics {
  reach: number
  results: number
  spend: number
  cost_per_result: number | null
  impressions: number
  cached_at: string | null
}

export function AdDetailDrawer({ adId, campaignId, goal, onClose }: AdDetailDrawerProps) {
  const [metrics, setMetrics] = useState<AdMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLeadGoal = (goal || "").toLowerCase() === "leads"

  const loadMetrics = useCallback(async () => {
    if (!adId || !campaignId) return
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/meta/metrics?campaignId=${encodeURIComponent(campaignId)}&adId=${encodeURIComponent(adId)}&dateRange=7d`,
        { cache: "no-store" }
      )
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load metrics")
      }
      setMetrics(json.metrics ?? null)
    } catch (err) {
      console.error("[AdDetailDrawer] loadMetrics error", err)
      setError(err instanceof Error ? err.message : "Failed to load metrics")
    } finally {
      setLoading(false)
    }
  }, [adId, campaignId])

  const refreshMetrics = useCallback(async () => {
    if (!adId || !campaignId) return
    
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch("/api/meta/metrics/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, adId, range: "7d" })
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to refresh metrics")
      }
      setMetrics(json.metrics ?? null)
    } catch (err) {
      console.error("[AdDetailDrawer] refresh error", err)
      setError(err instanceof Error ? err.message : "Failed to refresh metrics")
    } finally {
      setRefreshing(false)
    }
  }, [adId, campaignId])

  useEffect(() => {
    if (adId) {
      loadMetrics()
    }
  }, [adId, loadMetrics])

  if (!adId) {
    return null
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num)
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: amount < 10 ? 2 : 0
    }).format(amount)
  }

  const formatDateTime = (value: string | null): string => {
    if (!value) return "Never"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Never"
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date)
  }

  const getEffectivenessInsight = (costPerResult: number | null): string => {
    if (costPerResult == null) {
      return "Still gathering data. Check back soon for insights."
    }
    if (costPerResult <= 5) {
      return "Great job! You're getting excellent results for your spend."
    }
    if (costPerResult <= 15) {
      return "You're on track. Results are coming in at a reasonable cost."
    }
    return "Results are a bit expensive. Consider refreshing creative or refining your audience."
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center md:items-center animate-in fade-in duration-200">
      <div 
        className={cn(
          "bg-background w-full md:max-w-4xl md:max-h-[85vh] rounded-t-xl md:rounded-xl shadow-2xl",
          "flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Ad Performance</h2>
            <p className="text-sm text-muted-foreground">
              Detailed metrics for the last 7 days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshMetrics}
              disabled={refreshing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <Card className="border-red-200 bg-red-50 text-red-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Unable to load metrics</CardTitle>
                <CardDescription className="text-red-500">
                  {error}. Try refreshing in a moment.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {loading && !metrics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          ) : metrics ? (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <CardDescription>People reached</CardDescription>
                    </div>
                    <CardTitle className="text-3xl font-semibold">
                      {formatNumber(metrics.reach)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Unique people who saw your ad
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <CardDescription>Total results</CardDescription>
                    </div>
                    <CardTitle className="text-3xl font-semibold">
                      {formatNumber(metrics.results)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {isLeadGoal ? "Form submissions" : "Actions taken"}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <CardDescription>Amount spent</CardDescription>
                    </div>
                    <CardTitle className="text-3xl font-semibold">
                      {formatCurrency(metrics.spend)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Total ad spend in this period
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <CardDescription>Cost per result</CardDescription>
                    </div>
                    <CardTitle className="text-3xl font-semibold">
                      {metrics.cost_per_result != null 
                        ? formatCurrency(metrics.cost_per_result) 
                        : "—"
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Average cost for each result
                  </CardContent>
                </Card>
              </div>

              {/* Performance Insight */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    How it's going
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    {getEffectivenessInsight(metrics.cost_per_result)}
                  </p>
                  {metrics.cached_at && (
                    <p className="text-xs text-muted-foreground">
                      Last updated {formatDateTime(metrics.cached_at)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Performance Chart Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance over time</CardTitle>
                  <CardDescription>
                    Daily trend charts will appear here in a future update
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-40 items-center justify-center rounded border border-dashed border-border/70 text-sm text-muted-foreground">
                    Chart coming soon
                  </div>
                </CardContent>
              </Card>

              {/* Lead Inbox (if applicable) */}
              {isLeadGoal && (
                <div className="pt-4">
                  <LeadManager campaignId={campaignId} goal={goal} />
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No metrics available</CardTitle>
                <CardDescription>
                  Metrics will appear once your ad starts running and gathering data.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Need help? Ask the AI chat for suggestions.
          </div>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

