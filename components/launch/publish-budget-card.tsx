"use client"

/**
 * Feature: Launch - Publish Budget Card
 * Purpose: Combined card component that merges Complete All Steps and Budget sections
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Play, CheckCircle2, DollarSign, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [isBudgetOpen, setIsBudgetOpen] = useState(false)
  const progressPercentage = (completedCount / totalSteps) * 100

  const handleBudgetOpenChange = (open: boolean) => {
    if (budgetEditContent) {
      setIsBudgetOpen(open)
    }
  }

  return (
    <div className={cn(
      "rounded-lg border p-4",
      allStepsComplete 
        ? "border-green-500/30 bg-green-500/5 shadow-lg" 
        : "border-border bg-card"
    )}>
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left: Complete All Steps Section */}
        <div className="flex flex-col">
          {allStepsComplete ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-lg">Ready to Publish!</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                All steps completed. Review your campaign and publish when ready.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-lg mb-1.5">Complete All Steps</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {completedCount} of {totalSteps} steps completed
              </p>
              <div className="mb-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </>
          )}
          <Button 
            onClick={onPublish} 
            disabled={!allStepsComplete} 
            size="lg" 
            className={cn(
              "w-full gap-2 h-10 text-sm font-semibold mt-auto",
              allStepsComplete
                ? "bg-[#4B73FF] hover:bg-[#3d5fd9] shadow-lg"
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

        {/* Right: Budget Section */}
        <div className="flex flex-col">
          <Collapsible open={isBudgetOpen} onOpenChange={handleBudgetOpenChange} className="w-full">
            <CollapsibleTrigger 
              className={cn("w-full", !budgetEditContent && "cursor-default")} 
              onClick={(e) => {
                if (!budgetEditContent) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
            >
              <div className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 self-center",
                    isBudgetComplete ? "bg-green-500/10" : "bg-muted"
                  )}>
                    <DollarSign className={cn(
                      "h-5 w-5",
                      isBudgetComplete ? "text-green-600" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">Budget</h3>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {budgetSummaryContent}
                    </div>
                  </div>
                </div>
                {budgetEditContent && (
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                    isBudgetOpen && "rotate-180"
                  )} />
                )}
              </div>
            </CollapsibleTrigger>
            {budgetEditContent && (
              <CollapsibleContent className="pt-4">
                <div className="border-t pt-4">
                  {budgetEditContent}
                </div>
              </CollapsibleContent>
            )}
          </Collapsible>
        </div>
      </div>
    </div>
  )
}

