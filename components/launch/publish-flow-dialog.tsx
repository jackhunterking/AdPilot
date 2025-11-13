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
import { Input } from "@/components/ui/input"
import { CheckCircle2, Rocket, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export type PublishPhase = "confirm" | "publishing" | "success"

interface PublishFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignName?: string
  isEditMode?: boolean
  onComplete?: () => void | Promise<void>
  // Summary details for confirmation
  goalType?: string
  dailyBudget?: string
  locationCount?: number
  adAccountName?: string
  creativeSummary?: string
  // Budget adjustment support
  onBudgetChange?: (newBudget: number) => void
  currency?: string
}

export function PublishFlowDialog({
  open,
  onOpenChange,
  campaignName = "your ad",
  isEditMode = false,
  onComplete,
  goalType,
  dailyBudget,
  locationCount,
  adAccountName,
  creativeSummary,
  onBudgetChange,
  currency = "USD",
}: PublishFlowDialogProps) {
  const [phase, setPhase] = useState<PublishPhase>("confirm")
  const [error, setError] = useState<string | null>(null)
  
  // Budget editing state
  const [localBudget, setLocalBudget] = useState<number>(() => {
    if (dailyBudget) {
      const parsed = Number.parseFloat(dailyBudget.replace(/[^0-9.]/g, ''))
      return Number.isNaN(parsed) ? 20 : Math.round(parsed)
    }
    return 20
  })
  const [budgetError, setBudgetError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setPhase("confirm")
      setError(null)
      setBudgetError(null)
    } else {
      // Reset budget when dialog opens
      if (dailyBudget) {
        const parsed = Number.parseFloat(dailyBudget.replace(/[^0-9.]/g, ''))
        setLocalBudget(Number.isNaN(parsed) ? 20 : Math.round(parsed))
      } else {
        setLocalBudget(20)
      }
      setBudgetError(null)
    }
  }, [open, dailyBudget])

  // Budget helper functions
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `$${Math.round(value).toLocaleString()}`
    }
  }

  const handleBudgetChange = (value: string) => {
    const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''))
    if (Number.isNaN(parsed) || value === '') {
      setLocalBudget(0)
      setBudgetError('Please enter a valid budget')
    } else {
      const normalized = Math.max(0, Math.round(parsed))
      setLocalBudget(normalized)
      if (normalized < 1) {
        setBudgetError('Minimum budget is $1/day')
      } else {
        setBudgetError(null)
      }
    }
  }

  const adjustBudget = (delta: number) => {
    setLocalBudget(prev => {
      const next = Math.max(1, prev + delta)
      setBudgetError(null)
      return next
    })
  }

  const handleConfirm = async () => {
    // Validate budget before publishing
    if (localBudget < 1) {
      setBudgetError('Minimum budget is $1/day')
      return
    }

    setPhase("publishing")
    setError(null)
    
    try {
      // Update budget in context if changed
      if (onBudgetChange && localBudget > 0) {
        onBudgetChange(localBudget)
      }
      
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
            
            <div className="space-y-4 mb-6">
              <p className="text-sm text-muted-foreground">
                {isEditMode 
                  ? "Your changes will update the live ad. This may require Meta re-review."
                  : "Your ad is ready to go live. Please review your campaign setup:"}
              </p>
              
              {/* Comprehensive Summary */}
              {!isEditMode && (
                <div className="space-y-4">
                  {/* Read-only Summary Items */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm">
                    {goalType && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Goal:</span>
                        <span className="font-medium">{goalType}</span>
                      </div>
                    )}
                    {creativeSummary && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Creative:</span>
                        <span className="font-medium truncate ml-4 text-right max-w-[200px]" title={creativeSummary}>
                          {creativeSummary}
                        </span>
                      </div>
                    )}
                    {adAccountName && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Ad Account:</span>
                        <span className="font-medium truncate ml-4 text-right max-w-[200px]" title={adAccountName}>
                          {adAccountName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Budget Adjustment */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Adjust Budget</span>
                      <span className="text-xs text-muted-foreground">{currency} per day</span>
                    </div>
                    
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => adjustBudget(-5)}
                          disabled={localBudget <= 1 || phase !== "confirm"}
                          className="h-12 w-12 rounded-xl border-2 hover:bg-background transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <div className="flex flex-col items-center gap-1 min-w-[140px]">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={localBudget || ''}
                            onChange={(e) => handleBudgetChange(e.target.value)}
                            disabled={phase !== "confirm"}
                            className={cn(
                              "h-16 w-full text-center text-4xl font-bold border-2 bg-background/50 rounded-xl",
                              "focus-visible:ring-2 focus-visible:ring-offset-2",
                              budgetError ? "border-red-500 focus-visible:ring-red-500" : "border-border"
                            )}
                            placeholder="0"
                          />
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => adjustBudget(5)}
                          disabled={phase !== "confirm"}
                          className="h-12 w-12 rounded-xl border-2 hover:bg-background transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Budget Error */}
                    {budgetError && (
                      <p className="text-sm text-red-600 dark:text-red-400 text-center">
                        {budgetError}
                      </p>
                    )}

                    {/* Monthly Estimate */}
                    <div className="rounded-lg border border-border bg-muted/50 px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Estimated monthly spend
                        </span>
                        <span className="text-base font-bold">
                          {formatCurrency(localBudget * 30)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {isEditMode 
                  ? "Your ad will be submitted for re-review after changes are published."
                  : "You can edit or pause this ad anytime after publishing."}
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

