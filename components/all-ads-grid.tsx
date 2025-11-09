/**
 * Feature: All Ads Grid
 * Purpose: Grid view of ad cards (right panel only, no AI chat)
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useState, useEffect } from "react"
import { AdCard } from "@/components/ad-card"
import type { AdVariant } from "@/lib/types/workspace"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

interface SaveSuccessState {
  campaignName: string
  isEdit: boolean
  adId: string
  timestamp: number
}

export interface AllAdsGridProps {
  ads: AdVariant[]
  onViewAd: (adId: string) => void
  onEditAd: (adId: string) => void
  onPauseAd: (adId: string) => void
  onResumeAd: (adId: string) => void
  onCreateABTest: (adId: string) => void
  saveSuccessState: SaveSuccessState | null
  onClearSuccessState: () => void
}

export function AllAdsGrid({
  ads,
  onViewAd,
  onEditAd,
  onPauseAd,
  onResumeAd,
  onCreateABTest,
  saveSuccessState,
  onClearSuccessState,
}: AllAdsGridProps) {
  const handleCloseSuccess = () => {
    onClearSuccessState()
  }

  return (
    <>
      <Dialog open={!!saveSuccessState} onOpenChange={(open) => !open && handleCloseSuccess()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl">
                {saveSuccessState?.isEdit ? 'Changes Saved!' : 'Ad Published!'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {saveSuccessState?.isEdit 
                ? `${saveSuccessState.campaignName} has been updated successfully. The ad will continue running with the updated settings.`
                : `${saveSuccessState?.campaignName} has been published successfully and is now live.`
              }
            </p>
            <div className="flex justify-end">
              <Button
                onClick={handleCloseSuccess}
                className="bg-gradient-to-r from-[#6C8CFF] via-[#5C7BFF] to-[#52E3FF] text-white hover:brightness-105"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="flex-1 overflow-auto p-6">
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
    </>
  )
}

