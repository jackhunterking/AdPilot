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

import { useState, useMemo } from "react"
import { AdCard } from "@/components/ad-card"
import type { AdVariant, AdStatus } from "@/lib/types/workspace"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Rocket } from "lucide-react"
import { getStatusConfig, sortByStatusPriority, filterByStatus } from "@/lib/utils/ad-status"
import { cn } from "@/lib/utils"
import { AdApprovalPanel } from "@/components/admin/ad-approval-panel"

interface SaveSuccessState {
  campaignName: string
  isEdit: boolean
  adId: string
  timestamp: number
}

export interface AllAdsGridProps {
  ads: AdVariant[]
  campaignId: string
  onViewAd: (adId: string) => void
  onEditAd: (adId: string) => void
  onPublishAd: (adId: string) => void
  onPauseAd: (adId: string) => Promise<boolean>
  onResumeAd: (adId: string) => Promise<boolean>
  onCreateABTest: (adId: string) => void
  onDeleteAd: (adId: string) => void
  onRefreshAds?: () => void
  saveSuccessState: SaveSuccessState | null
  onClearSuccessState: () => void
}

type StatusFilter = 'all' | AdStatus

export function AllAdsGrid({
  ads,
  campaignId,
  onViewAd,
  onEditAd,
  onPublishAd,
  onPauseAd,
  onResumeAd,
  onCreateABTest,
  onDeleteAd,
  onRefreshAds,
  saveSuccessState,
  onClearSuccessState,
}: AllAdsGridProps) {
  const [publishAdId, setPublishAdId] = useState<string | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  
  const handleCloseSuccess = () => {
    onClearSuccessState()
  }
  
  const handlePublishClick = (adId: string) => {
    setPublishAdId(adId)
    setShowPublishDialog(true)
  }
  
  const handleConfirmPublish = () => {
    if (publishAdId) {
      onPublishAd(publishAdId)
    }
    setShowPublishDialog(false)
    setPublishAdId(null)
  }
  
  const publishingAd = publishAdId ? ads.find(ad => ad.id === publishAdId) : null
  
  // Filter and sort ads
  const filteredAds = useMemo(() => {
    let result = statusFilter === 'all' ? ads : filterByStatus(ads, [statusFilter])
    return sortByStatusPriority(result)
  }, [ads, statusFilter])
  
  // Count ads by status
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: ads.length } as Record<StatusFilter, number>
    ads.forEach(ad => {
      counts[ad.status] = (counts[ad.status] || 0) + 1
    })
    return counts
  }, [ads])
  
  // Define filter options
  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All Ads' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_approval', label: 'Under Review' },
    { value: 'active', label: 'Live' },
    { value: 'learning', label: 'Learning' },
    { value: 'paused', label: 'Paused' },
    { value: 'rejected', label: 'Needs Changes' },
  ]

  return (
    <>
      {/* Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Rocket className="h-6 w-6 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">Publish Ad?</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground mb-6">
            Are you sure you want to publish <strong>{publishingAd?.name}</strong>? The ad will go live and start spending your budget.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowPublishDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={handleConfirmPublish}
            >
              Publish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Save Success Dialog */}
      <Dialog open={!!saveSuccessState} onOpenChange={(open) => !open && handleCloseSuccess()}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl">
                {saveSuccessState?.isEdit ? 'Changes Saved!' : 'Ad Created!'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-6">
            {saveSuccessState?.isEdit 
              ? `${saveSuccessState.campaignName} has been updated successfully.`
              : `${saveSuccessState?.campaignName} has been saved as a draft. You can publish it when ready.`
            }
          </p>
          <div className="flex justify-end">
            <Button
              variant="default"
              onClick={handleCloseSuccess}
              size="lg"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-4">
          {/* Status Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterOptions.map((option) => {
              const count = statusCounts[option.value] || 0
              const isActive = statusFilter === option.value
              
              // Skip options with 0 ads (except 'all')
              if (option.value !== 'all' && count === 0) return null
              
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(option.value)}
                  className="gap-2"
                >
                  {option.label}
                  <Badge 
                    variant={isActive ? "secondary" : "outline"}
                    className="ml-1"
                  >
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </div>
          
          {/* Admin Approval Panel (dev only) */}
          {onRefreshAds && (
            <AdApprovalPanel
              ads={ads}
              campaignId={campaignId}
              onAdUpdated={onRefreshAds}
            />
          )}
          
          {/* Ads Grid */}
          {filteredAds.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-semibold mb-2">
                  {statusFilter === 'all' ? 'No ads yet' : `No ${filterOptions.find(o => o.value === statusFilter)?.label.toLowerCase()} ads`}
                </p>
                <p className="text-sm">
                  {statusFilter === 'all' 
                    ? 'Create your first ad to get started'
                    : 'Try selecting a different filter'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {filteredAds.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                onViewResults={() => onViewAd(ad.id)}
                onEdit={() => onEditAd(ad.id)}
                onPublish={() => handlePublishClick(ad.id)}
                onPause={() => onPauseAd(ad.id)}
                onResume={() => onResumeAd(ad.id)}
                onCreateABTest={() => onCreateABTest(ad.id)}
                onDelete={() => onDeleteAd(ad.id)}
                showABTestButton={ad.status === 'active'}
              />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

