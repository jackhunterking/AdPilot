/**
 * Feature: Results Panel
 * Purpose: Post-publish results view with metrics, ad preview, and action buttons
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Edit2, Pause, Play, TestTube2, ImageIcon, Video, Layers, LayoutGrid, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricsCard } from "@/components/results/metrics-card"
import { LeadFormIndicator } from "@/components/results/lead-form-indicator"
import { AdMockup } from "@/components/ad-mockup"
import type { AdVariant, AdMetrics, LeadFormInfo } from "@/lib/types/workspace"

export interface ResultsPanelProps {
  variant: AdVariant
  metrics: AdMetrics
  onEdit: () => void
  onPause: () => void
  onCreateABTest: () => void
  onViewAllAds: () => void  // Navigate to all-ads grid view
  leadFormInfo?: LeadFormInfo
  className?: string
}

export function ResultsPanel({
  variant,
  metrics,
  onEdit,
  onPause,
  onCreateABTest,
  onViewAllAds,
  leadFormInfo,
  className,
}: ResultsPanelProps) {
  const [activeFormat, setActiveFormat] = useState<'feed' | 'story' | 'reel'>('feed')
  const isPaused = variant.status === 'paused'
  
  // Debug: Log what copy data we received
  console.log('[ResultsPanel] 📋 Received variant data:', {
    id: variant.id,
    name: variant.name,
    headline: variant.creative_data.headline,
    primaryText: variant.creative_data.primaryText?.substring(0, 50) + '...',
    body: variant.creative_data.body?.substring(0, 50) + '...',
    description: variant.creative_data.description?.substring(0, 30) + '...',
    cta: variant.creative_data.cta,
  })

  const previewFormats = [
    { id: "feed" as const, label: "Feed", icon: ImageIcon },
    { id: "story" as const, label: "Story", icon: Layers },
    { id: "reel" as const, label: "Reel", icon: Video, comingSoon: true },
  ]

  return (
    <div className={cn("flex flex-1 h-full gap-6 overflow-auto", className)}>
      {/* Left: Ad Preview (40%) */}
      <div className="flex-[2] flex flex-col gap-4 min-w-0">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Ad Preview</h3>
              <div className="flex items-center gap-2">
                {previewFormats.map((format) => {
                  const Icon = format.icon
                  const isActive = activeFormat === format.id
                  
                  return (
                    <Button
                      key={format.id}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveFormat(format.id)}
                      className="px-3 py-1 h-8 text-xs relative"
                      disabled={format.comingSoon}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {format.label}
                      {format.comingSoon && (
                        <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <AdMockup
              format={activeFormat}
              imageUrl={variant.creative_data.imageVariations?.[0] || variant.creative_data.imageUrl}
              brandName="Business Name"
              primaryText={variant.creative_data.primaryText || variant.creative_data.body || ""}
              headline={variant.creative_data.headline || ""}
              description={variant.creative_data.description || variant.creative_data.body || ""}
              ctaText={variant.creative_data.cta || "Learn More"}
              status={variant.status === 'archived' ? 'draft' : variant.status}
              showEngagement={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right: Metrics & Actions (60%) */}
      <div className="flex-[3] flex flex-col gap-4 min-w-0">
        {/* Metrics Card */}
        <MetricsCard metrics={metrics} compactMode={true} />

        {/* Actions and Lead Form Grid */}
        <div className={cn("grid gap-4", leadFormInfo ? "grid-cols-2" : "grid-cols-1")}>
          {/* Action Buttons */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">🎬 Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-sm h-9"
                  onClick={onEdit}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit This Ad
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-sm h-9"
                  onClick={onPause}
                >
                  {isPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Resume Ad
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Pause Ad
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-sm h-9"
                  onClick={onCreateABTest}
                >
                  <TestTube2 className="h-3.5 w-3.5" />
                  Create A/B Test
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-sm h-9"
                  onClick={onViewAllAds}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  View All Ads
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lead Form Indicator (if leads campaign) */}
          {leadFormInfo && (
            <LeadFormIndicator leadFormInfo={leadFormInfo} />
          )}
        </div>
      </div>
    </div>
  )
}

