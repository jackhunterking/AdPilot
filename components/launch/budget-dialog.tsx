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
import { DollarSign, Loader2, Minus, Plus } from "lucide-react"
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{dialogTitle}</DialogTitle>
          <DialogDescription>
            Set your daily budget. We&apos;ll optimize spend across your ads automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Budget Display */}
          {currentDailyBudget && (
            <div className="rounded-lg bg-muted px-4 py-3 text-sm">
              <span className="text-muted-foreground">Current budget: </span>
              <span className="font-semibold">{formatCurrency(currentDailyBudget)}/day</span>
            </div>
          )}

          {/* Budget Input Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustBudget(-5)}
                disabled={dailyBudget <= 1 || isSaving}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={dailyBudget || ''}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  disabled={isSaving}
                  className={cn(
                    "h-12 pl-10 pr-4 text-center text-2xl font-bold",
                    error && "border-red-500 focus-visible:ring-red-500"
                  )}
                  placeholder="0"
                />
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustBudget(5)}
                disabled={isSaving}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {currency} per day
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
            )}
          </div>

          {/* Monthly Estimate */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Estimated monthly spend
              </span>
              <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(monthlyEstimate)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
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

