/**
 * Feature: Launch Progress Tracker
 * Purpose: Visual progress indicator for final launch step showing all step completion status
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

"use client"

import { CheckCircle2, AlertTriangle, Palette, Type, MapPin, Target, Link2, Rocket } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProgressStep {
  id: string
  label: string
  icon: React.ElementType
  completed: boolean
}

interface LaunchProgressTrackerProps {
  steps: ProgressStep[]
  className?: string
}

export function LaunchProgressTracker({ steps, className }: LaunchProgressTrackerProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isLast = index === steps.length - 1
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div
                  className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all",
                    step.completed
                      ? "bg-green-500/10 border-green-500/30 text-green-600"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-600"
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground text-center whitespace-nowrap">
                  {step.label}
                </span>
              </div>
              
              {/* Connecting Line */}
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-all",
                    step.completed && steps[index + 1]?.completed
                      ? "bg-green-500/30"
                      : "bg-border"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper function to create progress steps from context states
export function createProgressSteps({
  hasCreative,
  hasCopy,
  hasLocation,
  hasDestination,
  isMetaConnected,
}: {
  hasCreative: boolean
  hasCopy: boolean
  hasLocation: boolean
  hasDestination: boolean
  isMetaConnected: boolean
}): ProgressStep[] {
  return [
    {
      id: "creative",
      label: "Creative",
      icon: Palette,
      completed: hasCreative,
    },
    {
      id: "copy",
      label: "Copy",
      icon: Type,
      completed: hasCopy,
    },
    {
      id: "destination",
      label: "Destination",
      icon: Link2,
      completed: hasDestination,
    },
    {
      id: "location",
      label: "Location",
      icon: MapPin,
      completed: hasLocation,
    },
    {
      id: "launch",
      label: "Launch",
      icon: Rocket,
      completed: isMetaConnected,
    },
  ]
}

