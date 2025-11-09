/**
 * Feature: Ad Cards Grid - Ad Management View
 * Purpose: Display individual ad performance cards with filters for non-marketers to manage their ads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Edit2, Plus, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdData {
  id: string
  name: string
  status: "active" | "learning" | "paused" | "draft"
  metrics: {
    leads?: number
    cpa?: number
    spend?: number
    impressions?: number
  }
  lastUpdated: string
}

interface AdCardsGridProps {
  ads: AdData[]
  isLoading?: boolean
  onViewResults: (adId: string) => void
  onEdit: (adId: string) => void
  onCreateVariant: () => void
}

export function AdCardsGrid({ 
  ads, 
  isLoading = false,
  onViewResults, 
  onEdit,
  onCreateVariant 
}: AdCardsGridProps) {
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "paused">("all")

  // Filter ads based on selected filter
  const filteredAds = useMemo(() => {
    if (filter === "all") return ads
    return ads.filter(ad => ad.status === filter)
  }, [ads, filter])

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalLeads = ads.reduce((sum, ad) => sum + (ad.metrics.leads || 0), 0)
    const totalSpend = ads.reduce((sum, ad) => sum + (ad.metrics.spend || 0), 0)
    const activeCount = ads.filter(ad => ad.status === "active").length
    
    return {
      totalLeads,
      totalSpend,
      activeCount,
      totalAds: ads.length
    }
  }, [ads])

  const getStatusBadge = (status: AdData["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Active</Badge>
      case "learning":
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">Learning</Badge>
      case "paused":
        return <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20">Paused</Badge>
      case "draft":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your ads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with Summary */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Your Ads</h2>
          <p className="text-muted-foreground">
            View performance, edit ads, and manage your campaigns
          </p>
        </div>

        {/* Summary Stats */}
        {summary.totalAds > 0 && (
          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total Leads:</span>
              <span className="text-lg font-semibold">{summary.totalLeads}</span>
              {summary.totalLeads > 0 && (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total Spend:</span>
              <span className="text-lg font-semibold">{formatCurrency(summary.totalSpend)}</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active Ads:</span>
              <span className="text-lg font-semibold">{summary.activeCount} of {summary.totalAds}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Filter:</span>
          {(["all", "active", "draft", "paused"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Ad Cards Grid */}
      {filteredAds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                {filter === "all" 
                  ? "No ads yet. Let's build your first one!"
                  : `No ${filter} ads found. Try a different filter.`
                }
              </p>
              {filter === "all" && (
                <Button onClick={onCreateVariant} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Build Your First Ad
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAds.map((ad) => (
            <Card key={ad.id} className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{ad.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Updated {new Date(ad.lastUpdated).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(ad.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {ad.metrics.leads !== undefined && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="text-xl font-bold">{ad.metrics.leads}</p>
                    </div>
                  )}
                  {ad.metrics.cpa !== undefined && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Cost/Lead</p>
                      <p className="text-xl font-bold">{formatCurrency(ad.metrics.cpa)}</p>
                    </div>
                  )}
                  {ad.metrics.spend !== undefined && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Spend</p>
                      <p className="text-lg font-semibold">{formatCurrency(ad.metrics.spend)}</p>
                    </div>
                  )}
                  {ad.metrics.impressions !== undefined && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Impressions</p>
                      <p className="text-lg font-semibold">{ad.metrics.impressions.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onViewResults(ad.id)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    View Results
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onEdit(ad.id)}
                  >
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create Variant Card */}
          <Card className="border-dashed hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
            <CardContent 
              className="flex flex-col items-center justify-center h-full min-h-[200px] py-12"
              onClick={onCreateVariant}
            >
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Create New Variant</p>
                  <p className="text-sm text-muted-foreground">
                    Start an A/B test
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

