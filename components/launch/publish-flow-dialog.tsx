"use client"

/**
 * Feature: Launch - Publish Flow Dialog
 * Purpose: Simulated publish flow with progress tracking and completion states
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction#streaming
 *  - AI Elements: https://ai-sdk.dev/elements/overview#task-and-loader
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#observability
 *  - Supabase: https://supabase.com/docs/guides/database/workflows
 * 
 * NOTE: This component simulates the publish flow for UX demonstration.
 * TODO: Wire in actual Meta API calls when ready to publish to Facebook/Instagram:
 *   - Replace simulated delays with actual API calls to /api/meta/ads/launch
 *   - Add error handling for Meta API failures
 *   - Implement retry logic for transient failures
 *   - Add billing/payment verification before actual publish
 */

import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader } from "@/components/ai-elements/loader"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Rocket } from "lucide-react"

export type PublishPhase = "confirm" | "publishing" | "success"

interface PublishFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignName?: string
  isEditMode?: boolean
  onComplete?: () => void | Promise<void>
  // Summary details for confirmation
  dailyBudget?: string
  locationCount?: number
  adAccountName?: string
}

export function PublishFlowDialog({
  open,
  onOpenChange,
  campaignName = "your ad",
  isEditMode = false,
  onComplete,
  dailyBudget,
  locationCount,
  adAccountName,
}: PublishFlowDialogProps) {
  const [phase, setPhase] = useState<PublishPhase>("confirm")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setPhase("confirm")
      setError(null)
    }
  }, [open])

  const handleConfirm = async () => {
    setPhase("publishing")
    setError(null)
    
    try {
      // Call the onComplete callback which handles API calls
      await onComplete?.()
      
      // Show success state for 2 seconds
      setPhase("success")
      
      // Auto-close after 2 seconds and fire event
      setTimeout(() => {
        onOpenChange(false)
      }, 2000)
    } catch (err) {
      console.error('[PublishFlowDialog] Publish failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to publish ad')
      setPhase("confirm")
    }
  }

  const handleCancel = () => {
    if (phase === "confirm") {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={phase === "confirm" ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md p-6">
        {/* Phase 1: Confirmation */}
        {phase === "confirm" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Rocket className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Ready to Publish?</h2>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                {isEditMode 
                  ? "Your changes will update the live ad. This may require Meta re-review."
                  : "Your ad is ready to go live. Please review:"}
              </p>
              
              {/* Summary info */}
              {(dailyBudget || locationCount || adAccountName) && !isEditMode && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                  {dailyBudget && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium">{dailyBudget}/day</span>
                    </div>
                  )}
                  {locationCount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Locations:</span>
                      <span className="font-medium">{locationCount} {locationCount === 1 ? 'location' : 'locations'}</span>
                    </div>
                  )}
                  {adAccountName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ad Account:</span>
                      <span className="font-medium truncate ml-2">{adAccountName}</span>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                You can edit this ad anytime after publishing.
              </p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={handleConfirm}
                className="bg-gradient-to-r from-[#6C8CFF] via-[#5C7BFF] to-[#52E3FF] text-white hover:brightness-105"
              >
                Confirm & Publish
              </Button>
            </div>
          </>
        )}

        {/* Phase 2: Publishing */}
        {phase === "publishing" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Loader className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Publishing...</h2>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Please wait while we publish your ad.
            </p>
            
            <div className="flex justify-center">
              <Loader className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          </>
        )}

        {/* Phase 3: Success */}
        {phase === "success" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Success!</h2>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Your ad has been published successfully.
            </p>
            
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

