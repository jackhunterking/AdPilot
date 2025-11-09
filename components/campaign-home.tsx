/**
 * Feature: Campaign Home - Entry Point
 * Purpose: Provide clear two-path navigation for non-marketers: Build New Ad or View Current Ads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, LayoutGrid, ArrowRight } from "lucide-react"
import { useCampaignContext } from "@/lib/context/campaign-context"

interface CampaignHomeProps {
  onNavigate: (path: "build" | "view") => void
}

export function CampaignHome({ onNavigate }: CampaignHomeProps) {
  const { campaign } = useCampaignContext()
  
  // Check if campaign has any published ads
  const hasPublishedAds = campaign?.published_status === "active" || campaign?.published_status === "paused"
  
  return (
    <div className="flex items-center justify-center min-h-full p-8 bg-muted/20">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">What would you like to do?</h1>
          <p className="text-muted-foreground">
            Choose an action to get started with your campaign
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Build New Ad Card */}
          <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Build a New Ad</CardTitle>
              </div>
              <CardDescription className="text-base">
                Create fresh campaign ads with our guided 7-step wizard. Perfect for launching new campaigns or testing new creative.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => onNavigate("build")}
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                size="lg"
              >
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Takes about 5-10 minutes to complete
              </p>
            </CardContent>
          </Card>

          {/* View Current Ads Card */}
          <Card className={`group hover:shadow-lg transition-all duration-200 cursor-pointer ${
            hasPublishedAds 
              ? "hover:border-primary/50" 
              : "opacity-75 cursor-not-allowed"
          }`}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-3 rounded-lg transition-colors ${
                  hasPublishedAds
                    ? "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">View Current Ads</CardTitle>
              </div>
              <CardDescription className="text-base">
                {hasPublishedAds 
                  ? "See results, manage existing ads, view leads, and make adjustments to your running campaigns."
                  : "This section will be available once you've published your first ad. Start by building a new ad above."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => hasPublishedAds && onNavigate("view")}
                disabled={!hasPublishedAds}
                className={hasPublishedAds ? "w-full group-hover:bg-emerald-600 group-hover:text-white" : "w-full"}
                variant={hasPublishedAds ? "default" : "secondary"}
                size="lg"
              >
                {hasPublishedAds ? (
                  <>
                    View Ads
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  "No Ads Yet"
                )}
              </Button>
              {hasPublishedAds && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  View performance, edit ads, and manage leads
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats (if campaign has data) */}
        {hasPublishedAds && (
          <div className="mt-8 p-4 bg-card rounded-lg border">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium capitalize">{campaign?.published_status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Campaign:</span>
                  <span className="ml-2 font-medium">{campaign?.name}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

