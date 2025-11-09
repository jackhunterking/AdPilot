"use client"

/**
 * Feature: Launch - Publish Budget Card
 * Purpose: Combined card component that merges Complete All Steps and Budget sections
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction#core-concepts
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#overview
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 * 
 * NOTE: This component triggers the PublishFlowDialog via onPublish callback.
 * The isPublishing prop shows loading state during the simulated publish flow.
 * TODO: When integrating real Meta API, ensure error states are passed down as props.
 */

import { useMemo, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Play, CheckCircle2, DollarSign, ShieldCheck, AlertTriangle, Minus, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBudget } from "@/lib/context/budget-context"
import { getCurrencySymbol } from "@/lib/utils/currency"

interface PublishBudgetCardProps {
  allStepsComplete: boolean
  isPublished: boolean
  isPublishing?: boolean
  onPublish: () => void
}

const MIN_BUDGET = 5
const MAX_BUDGET = 100
const STEP = 5

export function PublishBudgetCard({
  allStepsComplete,
  isPublished,
  isPublishing = false,
  onPublish,
}: PublishBudgetCardProps) {
  const { budgetState, setDailyBudget, isComplete } = useBudget()

  const { symbol, code } = useMemo(
    () => getCurrencySymbol(budgetState.currency),
    [budgetState.currency],
  )

  const handleIncrement = () => {
    const next = Math.min(budgetState.dailyBudget + STEP, MAX_BUDGET)
    setDailyBudget(next)
  }

  const handleDecrement = () => {
    const next = Math.max(budgetState.dailyBudget - STEP, MIN_BUDGET)
    setDailyBudget(next)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/[^0-9]/g, "")
    const parsed = Number.parseInt(sanitized, 10)
    const value = Number.isFinite(parsed) ? parsed : budgetState.dailyBudget
    const clamped = Math.max(MIN_BUDGET, Math.min(MAX_BUDGET, value))
    setDailyBudget(clamped)
  }

  const isBudgetComplete = isComplete()

  return (
    <Card className="rounded-lg border border-border bg-card shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border",
                allStepsComplete
                  ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                  : "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
              )}
            >
              {allStepsComplete ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Publish ad</h3>
              <p className="text-sm text-muted-foreground">
                {allStepsComplete
                  ? "Everything looks good. Launch when you're ready."
                  : "Complete the remaining items before publishing."}
              </p>
            </div>
          </div>

          <Button
            onClick={onPublish}
            disabled={!allStepsComplete || isPublishing}
            className={cn(
              "w-full gap-2 h-11 text-sm font-semibold transition-colors shadow-sm sm:w-auto",
              isPublished
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : allStepsComplete
                ? "bg-gradient-to-r from-[#6C8CFF] via-[#5C7BFF] to-[#52E3FF] text-white hover:brightness-105"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {isPublished ? (
              <>
                <ShieldCheck className="h-5 w-5" />
                Ad Published
              </>
            ) : isPublishing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Publish Ad
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              isBudgetComplete
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <DollarSign className="h-4 w-4" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={budgetState.dailyBudget <= MIN_BUDGET}
            className="h-9 w-9 shrink-0"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <label htmlFor="publish-budget-input" className="sr-only">
            Daily budget
          </label>
          <Input
            id="publish-budget-input"
            inputMode="numeric"
            value={String(budgetState.dailyBudget)}
            onChange={handleInputChange}
            className="max-w-[80px] text-center"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            disabled={budgetState.dailyBudget >= MAX_BUDGET}
            className="h-9 w-9 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <div className="ml-auto text-right">
            <p className="text-lg font-semibold leading-none">
              {symbol}
              {budgetState.dailyBudget}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">{code} / day</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

