"use client"

/**
 * Feature: Launch - Publish Budget Card
 * Purpose: Combined card component that merges Complete All Steps and Budget sections
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, CheckCircle2, DollarSign, ShieldCheck, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PublishBudgetCardProps {
  allStepsComplete: boolean
  isPublished: boolean
  onPublish: () => void
  budgetSummaryContent: string
  isBudgetComplete: boolean
  budgetEditContent?: React.ReactNode
}

export function PublishBudgetCard({
  allStepsComplete,
  isPublished,
  onPublish,
  budgetSummaryContent,
  isBudgetComplete,
  budgetEditContent,
}: PublishBudgetCardProps) {
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
                  : "border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              )}
            >
              {allStepsComplete ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Publish campaign</h3>
              <p className="text-sm text-muted-foreground">
                {allStepsComplete
                  ? "Everything looks good. Launch when you're ready."
                  : "Complete the remaining items before publishing."}
              </p>
            </div>
          </div>

          <Button
            onClick={onPublish}
            disabled={!allStepsComplete}
            className={cn(
              "w-full gap-2 h-11 text-sm font-semibold transition-colors shadow-sm sm:w-auto",
              isPublished
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : allStepsComplete
                ? "bg-gradient-to-r from-[#6C8CFF] via-[#5C7BFF] to-[#52E3FF] text-white hover:brightness-105"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isPublished ? (
              <>
                <ShieldCheck className="h-5 w-5" />
                Campaign Published
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Publish Campaign
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isBudgetComplete
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Budget control</p>
                <p className="text-xs text-muted-foreground">Daily spend target aligned with strategy</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground">{budgetSummaryContent}</span>
          </div>

          <div className="mt-4 rounded-md border border-dashed border-border bg-card/60 p-4">
            {budgetEditContent ? (
              budgetEditContent
            ) : (
              <p className="text-sm text-muted-foreground">
                Set your daily budget to keep campaigns aligned with your spend goals.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

