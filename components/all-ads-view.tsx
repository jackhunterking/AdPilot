/**
 * Feature: All Ads View
 * Purpose: Grid view of all ads within a campaign with AI chat assistance
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import AIChat from "@/components/ai-chat"
import { AdCard } from "@/components/ad-card"
import type { AdVariant } from "@/lib/types/workspace"

export interface AllAdsViewProps {
  campaignId: string
  ads: AdVariant[]
  onViewAd: (adId: string) => void
  onEditAd: (adId: string) => void
  onPauseAd: (adId: string) => void
  onResumeAd: (adId: string) => void
  onCreateABTest: (adId: string) => void
  conversationId: string  // For AI chat continuity
}

export function AllAdsView({
  campaignId,
  ads,
  onViewAd,
  onEditAd,
  onPauseAd,
  onResumeAd,
  onCreateABTest,
  conversationId,
}: AllAdsViewProps) {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left: AI Chat (30%) */}
      <div className="flex-[3] border-r border-border">
        <AIChat 
          campaignId={campaignId}
          conversationId={conversationId}
        />
      </div>
      
      {/* Right: Ad Grid (70%) */}
      <div className="flex-[7] overflow-auto p-6">
        {ads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-semibold mb-2">No ads yet</p>
              <p className="text-sm">Create your first ad to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {ads.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                onView={() => onViewAd(ad.id)}
                onEdit={() => onEditAd(ad.id)}
                onPause={() => onPauseAd(ad.id)}
                onResume={() => onResumeAd(ad.id)}
                onCreateABTest={() => onCreateABTest(ad.id)}
                showABTestButton={ad.status === 'active'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

