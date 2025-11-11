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
import { ImageIcon, Layers, Video, Sparkles } from "lucide-react"

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
  const [showReelMessage, setShowReelMessage] = useState(false)

  const previewFormats = [
    { id: "feed", label: "Feed", icon: ImageIcon },
    { id: "story", label: "Story", icon: Layers },
    { id: "reel", label: "Reel", icon: Video },
  ] as const

  const handleReelClick = () => {
    setShowReelMessage(true)
    setTimeout(() => setShowReelMessage(false), 2500)
  }

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Main Content - Centered Single Column */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl mx-auto px-6 py-12">
          {/* Heading Section */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold">
              Ad Preview
            </h2>
          </div>

          {/* Format Tabs */}
          <div className="flex justify-center pb-4">
            <div className="inline-flex rounded-lg border border-border p-1 bg-card">
              {previewFormats.map((format) => {
                const Icon = format.icon
                const isActive = activeFormat === format.id

                if (format.id === "reel") {
                  return (
                    <div key={format.id} className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReelClick}
                        className="px-4 relative"
                      >
                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                        {format.label}
                        <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
                      </Button>
                      {showReelMessage && (
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="bg-popover border border-border rounded-md px-3 py-1.5 shadow-md">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Sparkles size={12} className="text-yellow-500" />
                              <span className="font-medium">Coming Soon!</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

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

