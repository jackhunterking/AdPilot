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
import { Edit2, Pause, Play, TestTube2, ImageIcon, Video, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricsCard } from "@/components/results/metrics-card"
import { LeadFormIndicator } from "@/components/results/lead-form-indicator"
import type { AdVariant, AdMetrics, LeadFormInfo } from "@/lib/types/workspace"

export interface ResultsPanelProps {
  variant: AdVariant
  metrics: AdMetrics
  onEdit: () => void
  onPause: () => void
  onCreateABTest: () => void
  leadFormInfo?: LeadFormInfo
  className?: string
}

export function ResultsPanel({
  variant,
  metrics,
  onEdit,
  onPause,
  onCreateABTest,
  leadFormInfo,
  className,
}: ResultsPanelProps) {
  const [activeFormat, setActiveFormat] = useState<'feed' | 'story' | 'reel'>('feed')
  const isPaused = variant.status === 'paused'

  const previewFormats = [
    { id: "feed" as const, label: "Feed", icon: ImageIcon },
    { id: "story" as const, label: "Story", icon: Layers },
    { id: "reel" as const, label: "Reel", icon: Video },
  ]

  // Render feed ad preview
  const renderFeedAd = () => {
    const { headline, body, cta, imageUrl, imageVariations } = variant.creative_data
    const displayImage = imageVariations?.[0] || imageUrl

    return (
      <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-border">
        {/* Ad Header */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
            B
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Business Name</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Sponsored
              {variant.status === 'active' && (
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              )}
              {isPaused && (
                <span className="inline-flex h-2 w-2 rounded-full bg-gray-500"></span>
              )}
            </p>
          </div>
        </div>

        {/* Ad Content */}
        <div>
          <p className="p-3 text-sm">{body}</p>
          {displayImage && (
            <img
              src={displayImage}
              alt="Ad creative"
              className="w-full h-auto object-cover"
            />
          )}
        </div>

        {/* Ad Footer */}
        <div className="p-3 space-y-2">
          <p className="font-semibold text-sm">{headline}</p>
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled
          >
            {cta || "Learn More"}
          </Button>
        </div>

        {/* Engagement Indicators (Static) */}
        <div className="flex items-center justify-around py-2 border-t border-border text-muted-foreground">
          <span className="text-xs">👍 Like</span>
          <span className="text-xs">💬 Comment</span>
          <span className="text-xs">↗️ Share</span>
        </div>
      </div>
    )
  }

  // Render story ad preview (simplified)
  const renderStoryAd = () => {
    const { headline, imageUrl, imageVariations } = variant.creative_data
    const displayImage = imageVariations?.[0] || imageUrl

    return (
      <div className="w-full max-w-xs mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl relative">
        {displayImage && (
          <img
            src={displayImage}
            alt="Story ad"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white font-semibold text-sm mb-2">{headline}</p>
          <Button
            size="sm"
            className="w-full bg-white text-black hover:bg-gray-100"
            disabled
          >
            Swipe Up
          </Button>
        </div>
        {variant.status === 'active' && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-white text-xs">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Live
            </span>
          </div>
        )}
      </div>
    )
  }

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
                      className="px-4"
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      {format.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeFormat === "story" ? renderStoryAd() : renderFeedAd()}
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

