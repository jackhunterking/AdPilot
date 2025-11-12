/**
 * Feature: Launch Requirements Card
 * Purpose: Display campaign launch readiness checklist with dynamic status
 * References:
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 */

"use client"

import { CheckCircle2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface RequirementItem {
  id: string
  label: string
  completed: boolean
  description?: string
}

interface LaunchRequirementsCardProps {
  requirements: RequirementItem[]
  allComplete: boolean
  className?: string
}

export function LaunchRequirementsCard({
  requirements,
  allComplete,
  className,
}: LaunchRequirementsCardProps) {
  const completedCount = requirements.filter((r) => r.completed).length
  const totalCount = requirements.length

  return (
    <Card
      className={cn(
        "border-2 transition-all",
        allComplete
          ? "border-green-500/30 bg-green-500/5 shadow-lg shadow-green-500/10"
          : "border-border bg-card",
        className
      )}
    >
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-xl font-semibold">
          {allComplete ? "You're ready to publish your ad!" : "Complete requirements"}
        </CardTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {allComplete
            ? "All requirements are met. Review your ad and publish when ready."
            : `Complete the remaining items before publishing. ${completedCount} of ${totalCount} completed.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Requirement Checklist */}
        <div className="space-y-2.5">
          {requirements.map((requirement) => (
            <div
              key={requirement.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all",
                requirement.completed
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-muted/30 border-border"
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {requirement.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    requirement.completed
                      ? "text-green-700 dark:text-green-400"
                      : "text-foreground"
                  )}
                >
                  {requirement.label}
                </p>
                {requirement.description && !requirement.completed && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {requirement.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        {allComplete && (
          <div className="mt-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-blue-700 dark:text-blue-400">Note:</span>{" "}
              Budget and Meta connection are managed in the header above. Make sure to set your campaign budget and connect your accounts before publishing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to create requirements from context states
export function createRequirements({
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
}): RequirementItem[] {
  return [
    {
      id: "creative",
      label: "Creative",
      completed: hasCreative,
      description: hasCreative ? undefined : "Select or generate ad images",
    },
    {
      id: "copy",
      label: "Copy",
      completed: hasCopy,
      description: hasCopy ? undefined : "Complete ad copy with headline and text",
    },
    {
      id: "destination",
      label: "Destination",
      completed: hasDestination,
      description: hasDestination ? undefined : "Set up website URL, form, or phone number",
    },
    {
      id: "location",
      label: "Location",
      completed: hasLocation,
      description: hasLocation ? undefined : "Target at least one location",
    },
    {
      id: "meta",
      label: "Meta Connected",
      completed: isMetaConnected,
      description: isMetaConnected
        ? undefined
        : "Connect Facebook & Instagram with payment method",
    },
  ]
}

