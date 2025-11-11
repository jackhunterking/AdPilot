/**
 * Feature: Launch Campaign View V4
 * Purpose: Minimal, confidence-focused final step centered on ad preview as hero element
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
import { cn } from "@/lib/utils"

interface LaunchCampaignViewProps {
  // Ad content for preview
  imageUrl?: string
  brandName?: string
  primaryText?: string
  headline?: string
  description?: string
  ctaText?: string
  
  className?: string
}

export function LaunchCampaignView({
  imageUrl,
  brandName,
  primaryText,
  headline,
  description,
  ctaText = "Learn More",
  className,
}: LaunchCampaignViewProps) {
  const [activeFormat, setActiveFormat] = useState<"feed" | "story" | "reel">("feed")

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Main Content - Centered Single Column */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl mx-auto px-6 py-12">
          {/* Heading Section */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">
              Preview Your Ad Before Publishing
            </h2>
            <p className="text-sm text-muted-foreground">
              This is exactly how your ad will appear across formats.
            </p>
          </div>

          {/* Format Tabs */}
          <div className="flex gap-2 justify-center border-b border-border mb-8">
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

          {/* Ad Mockup - Hero Element */}
          <div className="flex justify-center">
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
      </div>
    </div>
  )
}

