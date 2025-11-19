/**
 * Feature: Ad Card
 * Purpose: Individual ad card component for grid view with preview, metrics, and actions
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DeleteAdDialog } from "@/components/dialogs/delete-ad-dialog"
import { AlertTriangle, Trash2 } from "lucide-react"
import type { AdVariant, PublishError } from "@/lib/types/workspace"
import { AdStatusBadge } from "@/components/ui/ad-status-badge"
import { PublishButton } from "@/components/publishing/publish-button"
import { ErrorTooltip } from "@/components/publishing/error-tooltip"
import { PublishErrorModal } from "@/components/publishing/publish-error-modal"

export interface AdCardProps {
  ad: AdVariant
  onViewResults: () => void
  onEdit: () => void
  onPublish: () => void
  onPause: () => Promise<boolean>
  onResume: () => Promise<boolean>
  onCreateABTest: () => void
  onDelete: () => void
  showABTestButton: boolean
}

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString()
}

export function AdCard({
  ad,
  onViewResults,
  onEdit,
  onPublish,
  onPause,
  onResume,
  onCreateABTest,
  onDelete,
  showABTestButton,
}: AdCardProps) {
  const isPaused = ad.status === 'paused'
  const isDraft = ad.status === 'draft'
  const isFailed = ad.status === 'failed'
  const isRejected = ad.status === 'rejected'
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  
  // Extract error from ad.last_error if it exists (will be available after migration)
  const error: PublishError | undefined = (ad as { last_error?: PublishError }).last_error
  
  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }
  
  const handleConfirmDelete = () => {
    setShowDeleteDialog(false)
    onDelete()
  }
  
  const handlePauseClick = () => {
    setShowPauseDialog(true)
  }
  
  const handleConfirmPause = async () => {
    setShowPauseDialog(false)
    await onPause()
  }
  
  const handlePublishClick = async () => {
    setIsPublishing(true)
    try {
      await onPublish()
    } finally {
      setIsPublishing(false)
    }
  }
  
  const handleStatusAction = async () => {
    if (ad.status === 'draft' || ad.status === 'failed' || ad.status === 'rejected') {
      await handlePublishClick()
    } else if (ad.status === 'active' || ad.status === 'learning') {
      handlePauseClick()
    } else if (ad.status === 'paused') {
      await onResume()
    }
  }
  
  return (
    <>
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
            Are you sure you want to pause <strong>{ad.name}</strong>? The ad will stop running and won&apos;t reach new people until you resume it.
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

      <DeleteAdDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        adName={ad.name}
        onConfirm={handleConfirmDelete}
      />
      
      <div className="space-y-3">
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          {/* Ad preview thumbnail with overlay icons */}
          <div className="aspect-square bg-muted relative overflow-hidden group">
            {(() => {
              // Get the first available image from variations or single imageUrl
              const imageUrl = ad.creative_data.imageVariations?.[0] || ad.creative_data.imageUrl
              
              return imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={ad.name}
                  fill
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">No image</span>
                </div>
              )
            })()}
            
            {/* Icon overlays */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Trash icon - top right */}
              <button
                onClick={handleDeleteClick}
                className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 rounded-full text-white transition-all hover:scale-110 pointer-events-auto"
                aria-label="Delete ad"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Ad info */}
          <CardContent className="p-4">
            <h3 className="font-semibold mb-1 truncate" title={ad.name}>
            {ad.name}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <AdStatusBadge status={ad.status} size="sm" showTooltip={true} />
              {(isFailed || isRejected) && error && (
                <ErrorTooltip 
                  error={error} 
                  onClick={() => setShowErrorModal(true)}
                />
              )}
            </div>
            
            {/* Metrics */}
            {ad.metrics_snapshot && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  👁️ {formatNumber(ad.metrics_snapshot.impressions)} impressions
                </div>
                <div className="flex items-center gap-1">
                  🖱️ {formatNumber(ad.metrics_snapshot.clicks)} clicks
                </div>
                <div className="flex items-center gap-1">
                  📊 {ad.metrics_snapshot.ctr.toFixed(1)}% CTR
                </div>
                <div className="flex items-center gap-1">
                  💰 ${ad.metrics_snapshot.spend.toFixed(2)} spend
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Horizontal action buttons below card */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewResults}
            className="flex-1"
          >
            Results
          </Button>
          <PublishButton
            status={ad.status}
            onClick={handleStatusAction}
            loading={isPublishing}
            size="sm"
            className="flex-1"
          />
        </div>
        
        {/* Error Modal */}
        {error && (
          <PublishErrorModal
            open={showErrorModal}
            onOpenChange={setShowErrorModal}
            error={error}
            adName={ad.name}
            onRetry={handlePublishClick}
            onEdit={onEdit}
          />
        )}
      </div>
    </>
  )
}

