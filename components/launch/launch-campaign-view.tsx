/**
 * Feature: Launch Campaign View
 * Purpose: Final step UI for reviewing and publishing campaign - calm, minimal, decisive
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useState } from "react"
import { AdMockup } from "@/components/ad-mockup"
import { Button } from "@/components/ui/button"
import { LaunchProgressTracker, createProgressSteps } from "./launch-progress-tracker"
import { LaunchRequirementsCard, createRequirements } from "./launch-requirements-card"
import { cn } from "@/lib/utils"

interface LaunchCampaignViewProps {
  // Ad content for preview
  imageUrl?: string
  brandName?: string
  primaryText?: string
  headline?: string
  description?: string
  ctaText?: string
  
  // Completion status
  hasCreative: boolean
  hasCopy: boolean
  hasLocation: boolean
  hasAudience: boolean
  hasDestination: boolean
  isMetaConnected: boolean
  hasBudget: boolean
  
  className?: string
}

export function LaunchCampaignView({
  imageUrl,
  brandName,
  primaryText,
  headline,
  description,
  ctaText = "Learn More",
  hasCreative,
  hasCopy,
  hasLocation,
  hasAudience,
  hasDestination,
  isMetaConnected,
  hasBudget,
  className,
}: LaunchCampaignViewProps) {
  const [activeFormat, setActiveFormat] = useState<"feed" | "story" | "reel">("feed")

  // Calculate overall readiness
  const allRequirementsMet =
    hasCreative &&
    hasCopy &&
    hasLocation &&
    hasAudience &&
    hasDestination &&
    isMetaConnected &&
    hasBudget

  // Create progress steps
  const progressSteps = createProgressSteps({
    hasCreative,
    hasCopy,
    hasLocation,
    hasAudience,
    hasDestination,
    isMetaConnected: isMetaConnected && hasBudget, // Launch includes both Meta + Budget
  })

  // Create requirements list
  const requirements = createRequirements({
    hasCreative,
    hasCopy,
    hasLocation,
    hasAudience,
    hasDestination,
    isMetaConnected,
  })

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Progress Tracker - Top Section */}
      <div className="flex-shrink-0 px-6 py-6 border-b border-border bg-card/50">
        <LaunchProgressTracker steps={progressSteps} />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column - Ad Preview */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Ad Preview</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Review how your ad will appear across different formats
                </p>
              </div>

              {/* Format Tabs */}
              <div className="flex gap-2 border-b border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFormat("feed")}
                  className={cn(
                    "rounded-b-none border-b-2 transition-colors",
                    activeFormat === "feed"
                      ? "border-blue-500 text-blue-600 bg-blue-500/5"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Feed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFormat("story")}
                  className={cn(
                    "rounded-b-none border-b-2 transition-colors",
                    activeFormat === "story"
                      ? "border-blue-500 text-blue-600 bg-blue-500/5"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Story
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFormat("reel")}
                  className={cn(
                    "rounded-b-none border-b-2 transition-colors",
                    activeFormat === "reel"
                      ? "border-blue-500 text-blue-600 bg-blue-500/5"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Reel
                </Button>
              </div>

              {/* Ad Mockup */}
              <div className="flex justify-center pt-4">
                <div className={cn(
                  "w-full",
                  activeFormat === "feed" ? "max-w-md" : "max-w-sm"
                )}>
                  <AdMockup
                    format={activeFormat}
                    imageUrl={imageUrl}
                    brandName={brandName}
                    primaryText={primaryText}
                    headline={headline}
                    description={description}
                    ctaText={ctaText}
                    showEngagement={activeFormat === "feed"}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Requirements Checklist */}
            <div className="lg:sticky lg:top-8">
              <LaunchRequirementsCard
                requirements={requirements}
                allComplete={allRequirementsMet}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

