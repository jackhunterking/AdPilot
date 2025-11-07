"use client"

/**
 * Feature: Launch - Publish Budget Card
 * Purpose: Combined card component that merges Complete All Steps and Budget sections
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, CheckCircle2, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface PublishBudgetCardProps {
  allStepsComplete: boolean
  completedCount: number
  totalSteps: number
  isPublished: boolean
  onPublish: () => void
  budgetSummaryContent: string
  isBudgetComplete: boolean
  budgetEditContent?: React.ReactNode
}

export function PublishBudgetCard({
  allStepsComplete,
  completedCount,
  totalSteps,
  isPublished,
  onPublish,
  budgetSummaryContent,
  isBudgetComplete,
  budgetEditContent,
}: PublishBudgetCardProps) {
  const progressPercentage = (completedCount / totalSteps) * 100

  return (
    <Card
      className={cn(
        "border shadow-sm",
        allStepsComplete ? "border-green-500/40 bg-green-500/10" : "border-border bg-card"
      )}
    >
      <CardContent className="p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            {allStepsComplete ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Ready to publish</span>
                </div>
                <h3 className="text-lg font-semibold">All steps complete</h3>
                <p className="text-sm text-muted-foreground">
                  Give everything one last look and publish when you feel confident.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">Complete all steps</h3>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} of {totalSteps} steps completed
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={onPublish}
              disabled={!allStepsComplete}
              size="lg"
              className={cn(
                "w-full gap-2 h-11 text-sm font-semibold",
                allStepsComplete
                  ? "bg-[#4B73FF] hover:bg-[#3d5fd9] text-white shadow-lg"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isPublished ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
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

          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    isBudgetComplete ? "bg-green-500/15" : "bg-muted"
                  )}
                >
                  <DollarSign
                    className={cn(
                      "h-5 w-5",
                      isBudgetComplete ? "text-green-700" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">Budget</p>
                  <p className="text-xs text-muted-foreground">Daily spend target</p>
                </div>
              </div>
              <span className="text-sm font-medium text-foreground/80">{budgetSummaryContent}</span>
            </div>
            <Separator />
            {budgetEditContent ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-background p-4">
                {budgetEditContent}
              </div>
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

