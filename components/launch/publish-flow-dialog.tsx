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
import { Task, TaskTrigger, TaskContent, TaskItem } from "@/components/ai-elements/task"
import { Loader } from "@/components/ai-elements/loader"
import { Response } from "@/components/ai-elements/response"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Rocket, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export type PublishStep = 
  | "validating"
  | "creating-campaign"
  | "uploading-assets"
  | "configuring-targeting"
  | "scheduling"
  | "complete"

interface PublishFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignName?: string
  isEditMode?: boolean
  onComplete?: () => void | Promise<void>
}

interface StepConfig {
  id: PublishStep
  title: string
  description: string
  duration: number // milliseconds
}

const PUBLISH_STEPS: StepConfig[] = [
  {
    id: "validating",
    title: "Validating ad settings",
    description: "Checking all requirements are met",
    duration: 1200,
  },
  {
    id: "creating-campaign",
    title: "Creating ad structure",
    description: "Setting up ad in Meta Ads Manager",
    duration: 1500,
  },
  {
    id: "uploading-assets",
    title: "Uploading creative assets",
    description: "Uploading images and ad copy to Meta",
    duration: 2000,
  },
  {
    id: "configuring-targeting",
    title: "Configuring audience targeting",
    description: "Setting location, demographics, and interests",
    duration: 1200,
  },
  {
    id: "scheduling",
    title: "Scheduling ad",
    description: "Setting budget and schedule parameters",
    duration: 1000,
  },
]

export function PublishFlowDialog({
  open,
  onOpenChange,
  campaignName = "your ad",
  isEditMode = false,
  onComplete,
}: PublishFlowDialogProps) {
  const [currentStep, setCurrentStep] = useState<PublishStep | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<PublishStep>>(new Set())
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setCurrentStep(null)
      setCompletedSteps(new Set())
      setIsComplete(false)
      return
    }

    // Start the publish flow
    let isCancelled = false
    
    const runPublishFlow = async () => {
      for (const step of PUBLISH_STEPS) {
        if (isCancelled) return
        
        setCurrentStep(step.id)
        
        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, step.duration))
        
        if (isCancelled) return
        
        setCompletedSteps(prev => new Set([...prev, step.id]))
      }
      
      if (!isCancelled) {
        setCurrentStep("complete")
        setIsComplete(true)
        await onComplete?.()
      }
    }

    void runPublishFlow()

    return () => {
      isCancelled = true
    }
  }, [open, onComplete])

  const handleClose = () => {
    if (isComplete) {
      onOpenChange(false)
    }
  }

  const getStepStatus = (stepId: PublishStep): "pending" | "active" | "complete" => {
    if (completedSteps.has(stepId)) return "complete"
    if (currentStep === stepId) return "active"
    return "pending"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
              isComplete 
                ? "bg-green-500/10 text-green-600"
                : "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-600"
            )}>
              {isComplete ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <Rocket className="h-6 w-6" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {isComplete 
                  ? (isEditMode ? "Changes Saved!" : "Ad Published!")
                  : (isEditMode ? "Saving Changes" : "Publishing Ad")
                }
              </h2>
              <p className="text-sm text-muted-foreground">
                {isComplete 
                  ? (isEditMode ? `${campaignName} has been updated` : `${campaignName} is now live`)
                  : (isEditMode ? `Updating ${campaignName}...` : `Setting up ${campaignName}...`)
                }
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          {!isComplete && (
            <div className="space-y-4 mb-6">
              {PUBLISH_STEPS.map((step, index) => {
                const status = getStepStatus(step.id)
                
                return (
                  <Task key={step.id} defaultOpen={status === "active"}>
                    <TaskTrigger title={step.title}>
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                          status === "complete" && "border-green-500 bg-green-500/10 text-green-600",
                          status === "active" && "border-blue-500 bg-blue-500/10 text-blue-600",
                          status === "pending" && "border-muted-foreground/30 bg-muted text-muted-foreground"
                        )}>
                          {status === "complete" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : status === "active" ? (
                            <Loader size={16} />
                          ) : (
                            <span className="text-xs font-medium">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={cn(
                            "text-sm font-medium",
                            status === "pending" && "text-muted-foreground"
                          )}>
                            {step.title}
                          </p>
                        </div>
                      </div>
                    </TaskTrigger>
                    {status === "active" && (
                      <TaskContent>
                        <TaskItem>{step.description}</TaskItem>
                      </TaskContent>
                    )}
                  </Task>
                )
              })}
            </div>
          )}

          {/* Success State */}
          {isComplete && (
            <div className="space-y-4 mb-6">
              <Response isAnimating={false}>
                {isEditMode 
                  ? "Your changes have been saved successfully. The ad will continue running with the updated settings."
                  : "Your ad has been successfully published to Meta Ads Manager. It will begin running according to your schedule and budget settings."
                }
              </Response>
              
              {!isEditMode && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm mb-1">What happens next?</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Your ad will be reviewed by Meta (typically within 24 hours)</li>
                        <li>• Once approved, it'll start showing to your target audience</li>
                        <li>• You can monitor performance in the Results view</li>
                        <li>• Edit or pause your ad anytime from the dashboard</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          {isComplete && (
            <div className="flex justify-end">
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-[#6C8CFF] via-[#5C7BFF] to-[#52E3FF] text-white hover:brightness-105"
              >
                Close
              </Button>
            </div>
          )}

          {/* Loading State Footer */}
          {!isComplete && (
            <div className="text-center text-xs text-muted-foreground">
              Please don't close this window...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

