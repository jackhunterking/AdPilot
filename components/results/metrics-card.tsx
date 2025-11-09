/**
 * Feature: Metrics Card
 * Purpose: Display key performance indicators with trends for ad variants
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Eye, Users, MousePointerClick, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdMetrics } from "@/lib/types/workspace"

export interface MetricsCardProps {
  metrics: AdMetrics
  compareWith?: AdMetrics  // For A/B test comparison
  showTrend?: boolean
  compactMode?: boolean
  className?: string
}

interface MetricItemProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: number  // Percentage change
  isPositive?: boolean
  compactMode?: boolean
}

function MetricItem({ label, value, icon, trend, isPositive, compactMode }: MetricItemProps) {
  return (
    <div className={cn(
      "flex items-start gap-3",
      compactMode ? "py-2" : "py-3"
    )}>
      <div className={cn(
        "flex items-center justify-center rounded-full bg-muted/50 shrink-0",
        compactMode ? "h-10 w-10" : "h-12 w-12"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-muted-foreground mb-1",
          compactMode ? "text-xs" : "text-sm"
        )}>
          {label}
        </p>
        <p className={cn(
          "font-semibold",
          compactMode ? "text-xl" : "text-2xl"
        )}>
          {value}
        </p>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium mt-1",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === 0 ? (
              <Minus className="h-3 w-3 text-muted-foreground" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend === 0 ? "—" : `${Math.abs(trend)}%`}
          </div>
        )}
      </div>
    </div>
  )
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

  // Get trends
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

  return (
    <Card className={cn("", className)}>
      <CardContent className={cn(compactMode ? "p-4" : "p-6")}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn(
            "font-semibold",
            compactMode ? "text-base" : "text-lg"
          )}>
            📊 Live Metrics
          </h3>
          {metrics.last_updated && (
            <p className="text-xs text-muted-foreground">
              Updated {new Date(metrics.last_updated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="space-y-0">
          <MetricItem
            label="Impressions"
            value={formatNumber(metrics.impressions)}
            icon={<Eye className="h-5 w-5 text-muted-foreground" />}
            trend={impressionsTrend?.trend}
            isPositive={impressionsTrend?.isPositive}
            compactMode={compactMode}
          />

          <MetricItem
            label="Reach"
            value={formatNumber(metrics.reach)}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            trend={reachTrend?.trend}
            isPositive={reachTrend?.isPositive}
            compactMode={compactMode}
          />

          <MetricItem
            label="Clicks"
            value={formatNumber(metrics.clicks)}
            icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />}
            trend={clicksTrend?.trend}
            isPositive={clicksTrend?.isPositive}
            compactMode={compactMode}
          />

          {metrics.leads !== undefined && metrics.leads > 0 && (
            <MetricItem
              label="Leads"
              value={formatNumber(metrics.leads)}
              icon={<Users className="h-5 w-5 text-green-600" />}
              trend={leadsTrend?.trend}
              isPositive={leadsTrend?.isPositive}
              compactMode={compactMode}
            />
          )}

          <div className="pt-3 mt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">CTR</p>
                <p className={cn(
                  "font-semibold",
                  compactMode ? "text-sm" : "text-base"
                )}>
                  {formatPercentage(metrics.ctr)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">CPC</p>
                <p className={cn(
                  "font-semibold",
                  compactMode ? "text-sm" : "text-base"
                )}>
                  {formatCurrency(metrics.cpc)}
                </p>
              </div>

              {metrics.cpl && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">CPL</p>
                    <p className={cn(
                      "font-semibold",
                      compactMode ? "text-sm" : "text-base"
                    )}>
                      {formatCurrency(metrics.cpl)}
                    </p>
                  </div>
                </>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Spend</p>
                <p className={cn(
                  "font-semibold",
                  compactMode ? "text-sm" : "text-base"
                )}>
                  {formatCurrency(metrics.spend)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

