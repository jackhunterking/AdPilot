"use client"

import { Check, Lock, Target, Loader2, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { useAudience } from "@/lib/context/audience-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { cn } from "@/lib/utils"

interface AudienceSelectionCanvasProps {
  variant?: "step" | "summary"
}

export function AudienceSelectionCanvas({ variant = "step" }: AudienceSelectionCanvasProps = {}) {
  const { audienceState, resetAudience, setAudienceTargeting } = useAudience()
  const { isPublished } = useAdPreview()
  const [isEnabling, setIsEnabling] = useState(false)
  const isSummary = variant === "summary"

  const renderLayout = (content: React.ReactNode, maxWidthClass = "max-w-2xl") => {
    if (isSummary) {
      return (
        <div className={cn("mx-auto w-full", maxWidthClass, "space-y-8")}>{content}</div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className={cn("w-full space-y-8", maxWidthClass)}>{content}</div>
      </div>
    )
  }

  // Initial state - no audience set
  if (audienceState.status === "idle") {
    const content = (
      <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* AI Advantage+ Card - Matching Goal/Location Design Pattern */}
        <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border hover:bg-accent/20 transition-all duration-300">
          <div className="icon-tile-muted rounded-2xl h-20 w-20 flex items-center justify-center mb-4">
            <Sparkles className="h-10 w-10 text-brand-blue" />
          </div>
          <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
            <h3 className="text-xl font-semibold">AI Targeting</h3>
            <p className="text-sm text-muted-foreground">Enable AI Advantage+ audience targeting</p>
          </div>
          <Button
            size="lg"
            onClick={() => {
              if (isEnabling) return
              setIsEnabling(true)
              // Subtle transition before committing state
              setTimeout(() => {
                setAudienceTargeting({ mode: 'ai' })
                setIsEnabling(false)
              }, 500)
            }}
            disabled={isEnabling}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 mt-auto"
          >
            {isEnabling ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enabling...
              </span>
            ) : (
              'Enable AI Targeting'
            )}
          </Button>
        </div>
      </div>
    )

    return renderLayout(content)
  }

  // All other intermediate states removed

  // Completed: show compact confirmation matching Launch summary
  if (audienceState.status === "completed") {
    const content = (
      <div className="space-y-6">
        {/* Published Warning Banner */}
        {isPublished && !isSummary && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-left text-sm space-y-1">
                <p className="font-medium text-orange-700 dark:text-orange-400">Live Campaign - Edit with Caution</p>
                <p className="text-orange-600 dark:text-orange-300 text-xs">
                  This ad is currently published. Changes to audience targeting will update your live campaign.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="icon-tile-muted">
                <Target className="h-4 w-4" />
              </div>
              <h3 className="font-semibold">Audience</h3>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
            <div className="flex items-center gap-2">
              <div className="icon-tile-muted"><Sparkles className="h-4 w-4 text-brand-blue" /></div>
              <div>
                <p className="text-sm font-medium">AI Targeting</p>
                <p className="text-xs text-muted-foreground">AI Advantage+ will optimize who sees your ad</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-status-green text-xs font-medium">
              <Check className="h-4 w-4" /> Enabled
            </div>
          </div>
        </div>

        {/* Reset button for editing */}
        {!isSummary && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={resetAudience}
            >
              Reset Audience
            </Button>
          </div>
        )}
      </div>
    )

    return renderLayout(content)
  }

  // Error state
  if (audienceState.status === "error") {
    const content = (
      <div className="space-y-6 text-center">
        <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Something Went Wrong</h2>
          <p className="text-muted-foreground">
            {audienceState.errorMessage || "Couldn't set this up. Want to try again?"}
          </p>
        </div>
        <Button
          size="lg"
          onClick={resetAudience}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          Try Again
        </Button>
      </div>
    )

    return renderLayout(content, "max-w-xl")
  }

  return null
}

