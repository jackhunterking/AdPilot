"use client"

/**
 * Feature: Launch - Publish Section
 * Purpose: Enhanced publish button component with progress indicator and prominent positioning
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

import { Button } from "@/components/ui/button"
import { Play, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PublishSectionProps {
  allStepsComplete: boolean
  completedCount: number
  totalSteps: number
  isPublished: boolean
  onPublish: () => void
  className?: string
}

export function PublishSection({
  allStepsComplete,
  completedCount,
  totalSteps,
  isPublished,
  onPublish,
  className,
}: PublishSectionProps) {
  const progressPercentage = (completedCount / totalSteps) * 100

  return (
    <div className={cn(
      "rounded-lg border p-4",
      allStepsComplete 
        ? "border-green-500/30 bg-green-500/5 shadow-lg" 
        : "border-border bg-card",
      className
    )}>
      {allStepsComplete ? (
        <>
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-lg">Ready to Publish!</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            All steps completed. Review your ad and publish when ready.
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
          "w-full gap-2 h-10 text-sm font-semibold",
          allStepsComplete
            ? "bg-[#4B73FF] hover:bg-[#3d5fd9] shadow-lg"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isPublished ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Ad Published
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            Publish Ad
          </>
        )}
      </Button>
    </div>
  )
}

