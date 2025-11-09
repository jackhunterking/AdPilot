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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
import type { AdVariant } from "@/lib/types/workspace"

export interface AdCardProps {
  ad: AdVariant
  onView: () => void
  onEdit: () => void
  onPause: () => void
  onResume: () => void
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
  onView,
  onEdit,
  onPause,
  onResume,
  onCreateABTest,
  onDelete,
  showABTestButton,
}: AdCardProps) {
  const isPaused = ad.status === 'paused'
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }
  
  const handleConfirmDelete = () => {
    setShowDeleteDialog(false)
    onDelete()
  }
  
  return (
    <>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl">Delete Ad?</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground mb-6">
            Are you sure you want to delete <strong>{ad.name}</strong>? This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {/* Ad preview thumbnail */}
        <div className="aspect-square bg-muted relative overflow-hidden">
          {(() => {
            // Get the first available image from variations or single imageUrl
            const imageUrl = ad.creative_data.imageVariations?.[0] || ad.creative_data.imageUrl
            
            return imageUrl ? (
              <img
                src={imageUrl}
                alt={ad.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-sm">No image</span>
              </div>
            )
          })()}
        </div>
        
        {/* Ad info */}
        <CardContent className="p-4">
          <h3 className="font-semibold mb-1 truncate" title={ad.name}>
          {ad.name}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            {ad.status === 'active' && (
              <Badge className="bg-green-500 text-white hover:bg-green-600">
                🟢 Active
              </Badge>
            )}
            {ad.status === 'paused' && (
              <Badge variant="secondary">⏸️ Paused</Badge>
            )}
            {ad.status === 'draft' && (
              <Badge variant="outline">Draft</Badge>
            )}
          </div>
          
          {/* Metrics */}
          {ad.metrics_snapshot && (
            <div className="space-y-1 text-sm text-muted-foreground mb-4">
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
          
          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="w-full"
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="w-full"
            >
              Edit
            </Button>
            {isPaused ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onResume}
                className="w-full"
              >
                Resume
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                className="w-full"
              >
                Pause
              </Button>
            )}
            {showABTestButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateABTest}
                className="w-full"
              >
                A/B Test
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteClick}
              className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

