"use client"

/**
 * Feature: Launch Budget Confirmation Modal
 * Purpose: Final confirmation before publishing campaign with budget breakdown and Meta readiness check
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { DollarSign, TrendingUp, CheckCircle2, AlertCircle, Facebook, CreditCard, Loader2, ExternalLink } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { LaunchConfirmationData, BudgetAllocation } from "@/lib/types/meta-integration"

interface BudgetConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  confirmationData: LaunchConfirmationData
  onConfirm: () => Promise<void>
  onOpenBudgetPanel: () => void
}

export function BudgetConfirmationModal({
  open,
  onOpenChange,
  confirmationData,
  onConfirm,
  onOpenBudgetPanel,
}: BudgetConfirmationModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { campaignBudget, metaConnection, canLaunch, blockers } = confirmationData

  const handleConfirm = async () => {
    setConfirming(true)
    setError(null)
    
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Confirm Budget & Launch</DialogTitle>
          <DialogDescription>
            Review your campaign budget and allocation before going live
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total Budget */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400">Total Campaign Budget</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  ${campaignBudget.totalBudget.toLocaleString()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                onOpenBudgetPanel()
              }}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Adjust
            </Button>
          </div>

          {/* AI Budget Distribution */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-foreground" />
              <h4 className="font-semibold text-sm">AI Budget Distribution</h4>
            </div>

            {campaignBudget.allocations.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {campaignBudget.allocations.map((alloc: BudgetAllocation) => (
                  <div
                    key={alloc.adId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alloc.adName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{alloc.reasonCode}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {(alloc.confidenceScore * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        ${alloc.recommendedBudget.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((alloc.recommendedBudget / campaignBudget.totalBudget) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground bg-muted rounded-lg">
                Budget will be distributed once ads are created
              </div>
            )}
          </div>

          {/* Meta Connection Status */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Requirements Check</h4>
            
            <div
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                metaConnection.status === 'connected'
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              )}
            >
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                <span className="text-sm font-medium">Meta Connection</span>
              </div>
              {metaConnection.status === 'connected' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>

            <div
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                metaConnection.paymentStatus === 'verified'
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              )}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Payment Method</span>
              </div>
              {metaConnection.paymentStatus === 'verified' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
          </div>

          {/* Blockers Alert */}
          {!canLaunch && blockers.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">Cannot Launch Yet</p>
                <ul className="text-sm mt-1 space-y-1">
                  {blockers.map((blocker, idx) => (
                    <li key={idx}>• {blocker}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          {/* Success Message */}
          {canLaunch && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-400">
                All requirements met. Your campaign is ready to launch!
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">Launch Failed</p>
                <p className="text-sm">{error}</p>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canLaunch || confirming}
            className="gap-2"
          >
            {confirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Launch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

