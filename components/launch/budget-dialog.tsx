"use client"

/**
 * Feature: Budget Dialog
 * Purpose: Clean dialog popup for setting/changing campaign budget
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Minus, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBudget?: number | null
  currency?: string
  onSave: (dailyBudget: number) => Promise<void>
}

export function BudgetDialog({
  open,
  onOpenChange,
  currentBudget,
  currency = 'USD',
  onSave,
}: BudgetDialogProps) {
  const currentDailyBudget = currentBudget && currentBudget > 0 ? Math.round(currentBudget / 30) : null
  const [dailyBudget, setDailyBudget] = useState<number>(currentDailyBudget || 20)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset daily budget when dialog opens with current budget
  useEffect(() => {
    if (open) {
      setDailyBudget(currentDailyBudget || 20)
      setError(null)
    }
  }, [open, currentDailyBudget])

  const monthlyEstimate = dailyBudget * 30
  const hasChanges = currentDailyBudget ? dailyBudget !== currentDailyBudget : dailyBudget > 0
  const isValid = dailyBudget >= 1
  const canSave = hasChanges && isValid && !isSaving

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
      setDailyBudget(0)
      setError('Please enter a valid budget')
    } else {
      const normalized = Math.max(0, Math.round(parsed))
      setDailyBudget(normalized)
      if (normalized < 1) {
        setError('Minimum budget is $1/day')
      } else {
        setError(null)
      }
    }
  }

  const adjustBudget = (delta: number) => {
    setDailyBudget(prev => {
      const next = Math.max(1, prev + delta)
      setError(null)
      return next
    })
  }

  const handleSave = async () => {
    if (!canSave) return

    setIsSaving(true)
    setError(null)

    try {
      await onSave(dailyBudget)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget')
    } finally {
      setIsSaving(false)
    }
  }

  const dialogTitle = currentDailyBudget ? "Change Budget" : "Set Campaign Budget"

  return (
    <Dialog open={open} onOpenChange={(open) => !isSaving && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Set your daily budget. We&apos;ll optimize spend across your ads automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Current Budget Display */}
        {currentDailyBudget && (
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm mb-4">
            <span className="text-muted-foreground">Current: </span>
            <span className="font-semibold">{formatCurrency(currentDailyBudget)}/day</span>
          </div>
        )}

        {/* Budget Input Controls */}
        <div className="space-y-4">
          {/* Main Budget Card */}
          <div className="rounded-lg border border-border bg-muted/50 p-6">
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustBudget(-5)}
                disabled={dailyBudget <= 1 || isSaving}
                className="h-14 w-14 rounded-xl border-2 hover:bg-background transition-colors"
              >
                <Minus className="h-5 w-5" />
              </Button>
              
              <div className="flex flex-col items-center gap-2 min-w-[200px]">
                <div className="relative w-full">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={dailyBudget || ''}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    disabled={isSaving}
                    className={cn(
                      "h-20 w-full text-center text-5xl font-bold border-2 bg-background/50 rounded-xl",
                      "focus-visible:ring-2 focus-visible:ring-offset-2",
                      error ? "border-red-500 focus-visible:ring-red-500" : "border-border"
                    )}
                    placeholder="0"
                  />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {currency} per day
                </p>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustBudget(5)}
                disabled={isSaving}
                className="h-14 w-14 rounded-xl border-2 hover:bg-background transition-colors"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          )}

          {/* Monthly Estimate */}
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Estimated monthly spend
              </span>
              <span className="text-lg font-bold">
                {formatCurrency(monthlyEstimate)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Budget'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

