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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Edit2, Pause, Play, TestTube2, ImageIcon, Video, Layers, Sparkles, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { MetricsCard } from "@/components/results/metrics-card"
import { LeadFormIndicator } from "@/components/results/lead-form-indicator"
import { AdMockup } from "@/components/ad-mockup"
import type { AdVariant, AdMetrics, LeadFormInfo } from "@/lib/types/workspace"

export interface ResultsPanelProps {
  variant: AdVariant
  metrics: AdMetrics
  onEdit: () => void
  onPause: () => Promise<boolean>  // Returns true on success for navigation
  onResume: () => Promise<boolean>  // Returns true on success
  onCreateABTest: () => void
  leadFormInfo?: LeadFormInfo
  className?: string
}

export function ResultsPanel({
  variant,
  metrics,
  onEdit,
  onPause,
  onResume,
  onCreateABTest,
  leadFormInfo,
  className,
}: ResultsPanelProps) {
  const [activeFormat, setActiveFormat] = useState<'feed' | 'story' | 'reel'>('feed')
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const isPaused = variant.status === 'paused'
  const isDraft = variant.status === 'draft'
  
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
  
  const handlePauseClick = () => {
    setShowPauseDialog(true)
  }
  
  const handleConfirmPause = async () => {
    setShowPauseDialog(false)
    await onPause()
  }
  
  const handleResumeClick = () => {
    setShowResumeDialog(true)
  }
  
  const handleConfirmResume = async () => {
    setShowResumeDialog(false)
    await onResume()
  }

  return (
    <>
      {/* Pause Confirmation Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <DialogTitle className="text-xl">Pause Ad?</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground mb-6">
            Are you sure you want to pause <strong>{variant.name}</strong>? The ad will stop running and won&apos;t reach new people until you resume it.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowPauseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={handleConfirmPause}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Pause
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume Confirmation Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl">Resume Ad?</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground mb-6">
            Are you sure you want to resume <strong>{variant.name}</strong>? The ad will start running again and reach new people.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowResumeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={handleConfirmResume}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Resume
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className={cn("flex flex-1 h-full gap-6 p-6 overflow-auto", className)}>
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

                {isDraft ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm h-9 cursor-not-allowed opacity-60"
                    disabled
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause Ad
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-sm h-9"
                    onClick={isPaused ? handleResumeClick : handlePauseClick}
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
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-sm h-9 cursor-not-allowed opacity-50 relative"
                  disabled
                >
                  <TestTube2 className="h-3.5 w-3.5" />
                  A/B Test (Coming Soon)
                  <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
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
    </>
  )
}

