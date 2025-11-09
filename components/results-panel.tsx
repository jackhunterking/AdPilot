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

  const previewFormats = [
    { id: "feed" as const, label: "Feed", icon: ImageIcon },
    { id: "story" as const, label: "Story", icon: Layers },
    { id: "reel" as const, label: "Reel", icon: Video, comingSoon: true },
  ]

  return (
    <div className={cn("flex flex-1 h-full gap-6 overflow-auto", className)}>
      {/* Left: Ad Preview (60%) */}
      <div className="flex-[3] flex flex-col gap-4 min-w-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Ad Preview</h3>
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
                      className="px-4 relative"
                      disabled={format.comingSoon}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
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
          <CardContent>
            <AdMockup
              format={activeFormat}
              imageUrl={variant.creative_data.imageVariations?.[0] || variant.creative_data.imageUrl}
              brandName="Business Name"
              primaryText={variant.creative_data.body}
              headline={variant.creative_data.headline}
              description={variant.creative_data.body}
              ctaText={variant.creative_data.cta || "Learn More"}
              status={variant.status === 'archived' ? 'draft' : variant.status}
              showEngagement={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right: Metrics & Actions (40%) */}
      <div className="flex-[2] flex flex-col gap-4 min-w-0">
        {/* Metrics Card */}
        <MetricsCard metrics={metrics} />

        {/* Lead Form Indicator (if leads campaign) */}
        {leadFormInfo && (
          <LeadFormIndicator leadFormInfo={leadFormInfo} />
        )}

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-sm mb-4">🎬 Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onEdit}
              >
                <Edit2 className="h-4 w-4" />
                Edit This Ad
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onPause}
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume Ad
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause Ad
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onCreateABTest}
              >
                <TestTube2 className="h-4 w-4" />
                Create A/B Test
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={onViewAllAds}
              >
                <LayoutGrid className="h-4 w-4" />
                View All Ads
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-2">💡 Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Check metrics daily for best results</li>
              <li>• Leads appear within 24-48 hours</li>
              <li>• Consider A/B testing after 3 days</li>
              <li>• Pause underperforming ads to save budget</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

