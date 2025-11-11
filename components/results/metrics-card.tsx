/**
 * Feature: Metrics Card
 * Purpose: Display key performance indicators with trends for ad variants in horizontal table
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdMetrics } from "@/lib/types/workspace"

export interface MetricsCardProps {
  metrics: AdMetrics
  compareWith?: AdMetrics  // For A/B test comparison
  showTrend?: boolean
  compactMode?: boolean
  className?: string
}

export function MetricsCard({
  metrics,
  compareWith,
  showTrend = false,
  compactMode = false,
  className,
}: MetricsCardProps) {
  // Calculate trends if comparison metrics provided
  const calculateTrend = (current: number, previous: number): { trend: number; isPositive: boolean } => {
    if (previous === 0) return { trend: 0, isPositive: false }
    const percentChange = ((current - previous) / previous) * 100
    return {
      trend: Math.round(percentChange),
      isPositive: percentChange > 0,
    }
  }

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString()
  }

  // Format currency
  const formatCurrency = (num: number): string => {
    return `$${num.toFixed(2)}`
  }

  // Format percentage
  const formatPercentage = (num: number): string => {
    return `${num.toFixed(2)}%`
  }

  // Get trends for all metrics
  const impressionsTrend = compareWith && showTrend
    ? calculateTrend(metrics.impressions, compareWith.impressions)
    : undefined

  const reachTrend = compareWith && showTrend
    ? calculateTrend(metrics.reach, compareWith.reach)
    : undefined

  const clicksTrend = compareWith && showTrend
    ? calculateTrend(metrics.clicks, compareWith.clicks)
    : undefined

  const leadsTrend = compareWith && showTrend && metrics.leads && compareWith.leads
    ? calculateTrend(metrics.leads, compareWith.leads)
    : undefined

  const ctrTrend = compareWith && showTrend
    ? calculateTrend(metrics.ctr, compareWith.ctr)
    : undefined

  const cpcTrend = compareWith && showTrend
    ? calculateTrend(metrics.cpc, compareWith.cpc)
    : undefined

  const cplTrend = compareWith && showTrend && metrics.cpl && compareWith.cpl
    ? calculateTrend(metrics.cpl, compareWith.cpl)
    : undefined

  const spendTrend = compareWith && showTrend
    ? calculateTrend(metrics.spend, compareWith.spend)
    : undefined

  // Render trend indicator
  const TrendIndicator = ({ trend, isPositive }: { trend?: number; isPositive?: boolean }) => {
    if (trend === undefined) return null
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : trend === 0 ? (
          <Minus className="h-3 w-3 text-muted-foreground" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{trend === 0 ? "—" : `${Math.abs(trend)}%`}</span>
      </div>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className={cn(compactMode ? "p-4" : "p-6")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn(
            "font-semibold",
            compactMode ? "text-base" : "text-lg"
          )}>
            Live Metrics
          </h3>
          {metrics.last_updated && (
            <p className="text-xs text-muted-foreground">
              Updated {new Date(metrics.last_updated).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Horizontal Scrollable Table */}
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 min-w-[120px]">
                  Impressions
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 min-w-[100px]">
                  Reach
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 min-w-[100px]">
                  Clicks
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 min-w-[100px]">
                  Leads
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 min-w-[100px]">
                  CTR
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 min-w-[100px]">
                  CPC
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 min-w-[100px]">
                  CPL
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4 min-w-[100px]">
                  Spend
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* Impressions */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-base">
                    {formatNumber(metrics.impressions)}
                  </div>
                  <TrendIndicator trend={impressionsTrend?.trend} isPositive={impressionsTrend?.isPositive} />
                </td>

                {/* Reach */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-base">
                    {formatNumber(metrics.reach)}
                  </div>
                  <TrendIndicator trend={reachTrend?.trend} isPositive={reachTrend?.isPositive} />
                </td>

                {/* Clicks */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-base">
                    {formatNumber(metrics.clicks)}
                  </div>
                  <TrendIndicator trend={clicksTrend?.trend} isPositive={clicksTrend?.isPositive} />
                </td>

                {/* Leads */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-base">
                    {metrics.leads !== undefined && metrics.leads > 0 
                      ? formatNumber(metrics.leads)
                      : "—"
                    }
                  </div>
                  {metrics.leads !== undefined && metrics.leads > 0 && (
                    <TrendIndicator trend={leadsTrend?.trend} isPositive={leadsTrend?.isPositive} />
                  )}
                </td>

                {/* CTR */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-base">
                    {formatPercentage(metrics.ctr)}
                  </div>
                  <TrendIndicator trend={ctrTrend?.trend} isPositive={ctrTrend?.isPositive} />
                </td>

                {/* CPC */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-base">
                    {formatCurrency(metrics.cpc)}
                  </div>
                  <TrendIndicator trend={cpcTrend?.trend} isPositive={cpcTrend?.isPositive} />
                </td>

                {/* CPL */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-base">
                    {metrics.cpl ? formatCurrency(metrics.cpl) : "—"}
                  </div>
                  {metrics.cpl && (
                    <TrendIndicator trend={cplTrend?.trend} isPositive={cplTrend?.isPositive} />
                  )}
                </td>

                {/* Spend */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-base">
                    {formatCurrency(metrics.spend)}
                  </div>
                  <TrendIndicator trend={spendTrend?.trend} isPositive={spendTrend?.isPositive} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

