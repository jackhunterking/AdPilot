"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, Check, ChevronLeft, ChevronRight, LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  number: number
  title: string
  description: string
  completed: boolean
  content: React.ReactNode
  icon?: LucideIcon
}

// Dynamic content for each step
const stepHeaders: Record<string, { title: string; subtitle: string; subtext: string }> = {
  ads: {
    title: "Ad Creative",
    subtitle: "Select the design that stands out",
    subtext: "Pick a creative that best represents your brand"
  },
  copy: {
    title: "Ad Copy",
    subtitle: "Choose words that convert",
    subtext: "Select compelling copy for your campaign"
  },
  destination: {
    title: "Ad Destination",
    subtitle: "Configure where users will go",
    subtext: "Set up the form, URL, or phone number for this ad"
  },
  location: {
    title: "Ad Location",
    subtitle: "Reach the right places",
    subtext: "Define where your ads will appear"
  },
  goal: {
    title: "Set Your Objective",
    subtitle: "Define what success looks like",
    subtext: "Choose your campaign's primary goal"
  },
  budget: {
    title: "Ad Preview",
    subtitle: "Review and launch your ad",
    subtext: "Preview your ad and configure budget before publishing"
  }
}

interface CampaignStepperProps {
  steps: Step[]
  campaignId?: string
  completedSteps?: string[] // NEW: Backend-driven completion state
}

export function CampaignStepper({ steps, campaignId, completedSteps = [] }: CampaignStepperProps) {
  const searchParams = useSearchParams()
  const isNewAd = searchParams.get('newAd') === 'true'
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const hasInitializedRef = useRef(false)
  const lastDispatchedStepRef = useRef<string | null>(null)
  // During hydration many contexts may mark steps as completed at once. We treat
  // that as a restored session and jump to the first incomplete step exactly once.

  // Auto-jump to first incomplete step or restore last viewed step on mount
  useEffect(() => {
    if (hasInitializedRef.current) return

    // If newAd=true, force step 0 (Ad Creative) regardless of any other state
    if (isNewAd) {
      console.log('[CampaignStepper] New ad creation detected - forcing step 0')
      setCurrentStepIndex(0)
      hasInitializedRef.current = true
      return
    }

    // Try to restore last viewed step from session storage
    let restoredIndex: number | null = null
    if (campaignId) {
      try {
        const savedStepId = sessionStorage.getItem(`campaign:${campaignId}:currentStep`)
        if (savedStepId) {
          const savedIndex = steps.findIndex(s => s.id === savedStepId)
          if (savedIndex >= 0) {
            restoredIndex = savedIndex
            console.log('[CampaignStepper] Restored last viewed step:', savedStepId)
          }
        }
      } catch (error) {
        console.warn('[CampaignStepper] Failed to restore step from sessionStorage')
      }
    }

    // If no saved step, use backend completedSteps to find first incomplete
    if (restoredIndex === null) {
      const firstIncomplete = steps.findIndex(s => !completedSteps.includes(s.id))
      restoredIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

      console.log('[CampaignStepper] No saved step, using first incomplete', {
        completedSteps,
        firstIncompleteStep: steps[restoredIndex]?.id,
        targetIndex: restoredIndex
      })
    }

    setCurrentStepIndex(restoredIndex)
    hasInitializedRef.current = true
  }, [steps, isNewAd, completedSteps, campaignId])

  // Clamp currentStepIndex whenever steps array size or ordering changes
  useEffect(() => {
    if (currentStepIndex > steps.length - 1) {
      setCurrentStepIndex(Math.max(0, steps.length - 1))
    }
  }, [steps.length, currentStepIndex])


  // Support external navigation requests (Edit links in summary cards)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ id?: string; force?: boolean }>
      const stepId = custom.detail?.id
      const force = custom.detail?.force === true
      if (!stepId) return
      const targetIndex = steps.findIndex((s) => s.id === stepId)
      if (targetIndex < 0) return

      // Rules: 
      // - If force=true, allow navigation to any step (for explicit navigation overrides)
      // - Otherwise: allow moving backward freely; allow moving forward only to
      //   completed steps, never beyond the first incomplete step.
      if (force) {
        // Force navigation - allow going to any step
        if (targetIndex === currentStepIndex) return
        setDirection(targetIndex > currentStepIndex ? 'forward' : 'backward')
        setCurrentStepIndex(targetIndex)
        return
      }

      const firstIncomplete = steps.findIndex((s) => !s.completed)
      const maxForwardIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

      const clampedIndex = targetIndex <= currentStepIndex
        ? targetIndex // backward edit always allowed
        : Math.min(targetIndex, maxForwardIndex)

      if (clampedIndex === currentStepIndex) return

      setDirection(clampedIndex > currentStepIndex ? 'forward' : 'backward')
      setCurrentStepIndex(clampedIndex)
    }

    window.addEventListener('gotoStep', handler as EventListener)
    return () => window.removeEventListener('gotoStep', handler as EventListener)
  }, [steps, currentStepIndex])

  // Handle legacy switchToTab events to navigate to a step by id (e.g., from AI chat tool UI)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<string | { id?: string; force?: boolean }>
      const detail = custom.detail
      const stepId = typeof detail === 'string' ? detail : (detail && typeof detail === 'object' ? (detail as { id?: string; force?: boolean }).id : undefined)
      const force = typeof detail === 'object' && detail !== null ? (detail as { force?: boolean }).force === true : false
      if (!stepId) return

      const targetIndex = steps.findIndex((s) => s.id === stepId)
      if (targetIndex < 0) return

      // If force=true, allow navigation to any step
      if (force) {
        if (targetIndex === currentStepIndex) return
        setDirection(targetIndex > currentStepIndex ? 'forward' : 'backward')
        setCurrentStepIndex(targetIndex)
        return
      }

      const firstIncomplete = steps.findIndex((s) => !s.completed)
      const maxForwardIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

      const clampedIndex = targetIndex <= currentStepIndex
        ? targetIndex
        : Math.min(targetIndex, maxForwardIndex)

      if (clampedIndex === currentStepIndex) return

      setDirection(clampedIndex > currentStepIndex ? 'forward' : 'backward')
      setCurrentStepIndex(clampedIndex)
    }

    window.addEventListener('switchToTab', handler as EventListener)
    return () => window.removeEventListener('switchToTab', handler as EventListener)
  }, [steps, currentStepIndex])

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex >= steps.length - 1
  const currentStepCompleted = Boolean(currentStep?.completed)
  const canGoNext = currentStepCompleted
  
  // Emit stepChanged event when current step changes AND persist to session storage
  useEffect(() => {
    if (!currentStep || typeof window === 'undefined') return
    
    // Save current step to session storage for page refresh restore
    if (campaignId) {
      try {
        sessionStorage.setItem(`campaign:${campaignId}:currentStep`, currentStep.id)
      } catch (error) {
        console.warn('[CampaignStepper] Failed to save current step to sessionStorage')
      }
    }
    
    // Only dispatch if step ID actually changed (prevent duplicate events)
    if (lastDispatchedStepRef.current === currentStep.id) {
      return
    }
    
    lastDispatchedStepRef.current = currentStep.id
    
    console.log('[CampaignStepper] Step changed to:', currentStep.id)
    window.dispatchEvent(new CustomEvent('stepChanged', {
      detail: { 
        stepId: currentStep.id, 
        stepIndex: currentStepIndex,
        isLastStep: currentStepIndex >= steps.length - 1
      }
    }))
  }, [currentStepIndex, currentStep, steps.length, campaignId])

  const handleNext = () => {
    if (canGoNext && !isLastStep) {
      setDirection('forward')
      setCurrentStepIndex(prev => prev + 1)
      // Dispatch event to clear any editing references
      window.dispatchEvent(new CustomEvent('stepNavigation', { detail: { direction: 'next' } }))
    }
  }

  // Listen for global auto-advance events (e.g., after AI targeting or Meta connect)
  useEffect(() => {
    const handler = () => {
      // Ignore auto-advance signals during hydration/init to prevent spurious jumps
      if (!hasInitializedRef.current) return
      // Don't auto-advance from the "ads" step - let user manually click Next
      if (currentStep?.id === 'ads') return
      if (currentStepCompleted && !isLastStep) {
        handleNext()
      }
    }
    window.addEventListener('autoAdvanceStep', handler)
    return () => window.removeEventListener('autoAdvanceStep', handler)
  }, [currentStepCompleted, isLastStep, currentStep])

  const handleBack = () => {
    if (!isFirstStep) {
      setDirection('backward')
      setCurrentStepIndex(prev => prev - 1)
      // Dispatch event to clear any editing references
      window.dispatchEvent(new CustomEvent('stepNavigation', { detail: { direction: 'back' } }))
    }
  }

  // Step indicators are now non-interactive - navigation only via Back/Next buttons or AI chat
  // const handleStepClick = (index: number) => {
  //   // Only allow navigation to completed steps or the next step if current is complete
  //   const targetStep = steps[index]
  //   if (!targetStep) return
  //   
  //   const isTargetCompleted = targetStep.completed
  //   const isNextStep = index === currentStepIndex + 1
  //   const isPreviousStep = index < currentStepIndex
  //   const canNavigate = isTargetCompleted || isPreviousStep || (isNextStep && currentStepCompleted)
  //   
  //   if (!canNavigate) {
  //     return // Block navigation to incomplete future steps
  //   }
  //   
  //   setDirection(index > currentStepIndex ? 'forward' : 'backward')
  //   setCurrentStepIndex(index)
  //   // Dispatch event to clear any editing references
  //   window.dispatchEvent(new CustomEvent('stepNavigation', { detail: { direction: index > currentStepIndex ? 'forward' : 'backward' } }))
  // }

  // Get dynamic header content for current step
  const currentStepHeader = currentStep
    ? (stepHeaders[currentStep.id] || {
        title: currentStep.title,
        subtitle: currentStep.description,
        subtext: "Complete this step to continue"
      })
    : { title: "", subtitle: "", subtext: "" }

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* If steps are not ready yet (e.g., during goal switch), render a lightweight placeholder while keeping hooks order stable */}
      {!currentStep ? (
        <>
          <div className="px-6 pt-4 pb-4 border-b border-border bg-card flex-shrink-0" />
          <div className="flex-1" />
          <div className="border-t border-border bg-card px-6 py-4 flex-shrink-0" />
        </>
      ) : (
        <>
          {/* Progress Header */}
          <div className="px-6 pt-4 pb-4 bg-card flex-shrink-0">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-4">
                <h1 className="text-xl font-bold leading-tight">{currentStepHeader.title}</h1>
              </div>

              {/* Step Indicators with Inline Navigation */}
              <div className="flex items-center justify-between gap-4 h-10">
                {/* Back Button - Hidden on first step */}
                {!isFirstStep ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="gap-1.5 flex-shrink-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div className="w-20" />
                )}

                {/* Step Indicators */}
                <div className="flex items-center justify-center gap-2">
                  {steps.map((step, index) => {
                    return (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={cn(
                          "relative flex items-center justify-center transition-opacity",
                          index === currentStepIndex
                            ? "h-10 w-10"
                            : "h-8 w-8"
                        )}
                        title={step.title}
                      >
                        <div
                          className={cn(
                            "absolute inset-0 flex items-center justify-center rounded-full border transition-all",
                            completedSteps.includes(step.id) // Use backend completedSteps prop
                              ? "border-green-500 bg-green-500 text-white"
                              : index === currentStepIndex
                              ? "border-yellow-500 bg-yellow-500 text-white"
                              : "border-muted-foreground/20 bg-muted text-muted-foreground"
                          )}
                        >
                          {completedSteps.includes(step.id) ? ( // Use backend completedSteps prop
                            <Check className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </div>
                        
                        {/* Active step indicator ring */}
                        {index === currentStepIndex && (
                          <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-in zoom-in duration-200" />
                        )}
                      </div>
                      
                      {/* Connector Line */}
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            "h-0.5 w-8 transition-colors",
                            steps[index + 1]?.completed || index < currentStepIndex
                              ? "bg-green-500"
                              : "bg-muted"
                          )}
                        />
                      )}
                    </div>
                    )
                  })}
                </div>

                {/* Next Button - Hidden on last step */}
                {!isLastStep ? (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className="gap-1.5 flex-shrink-0 bg-[#4B73FF] hover:bg-[#3d5fd9]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="w-20" />
                )}
              </div>

            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-hidden relative bg-background h-full min-h-0">
            <div
              key={currentStepIndex}
              className="absolute inset-0 overflow-auto"
            >
              <div className="p-6 min-h-full">
                {currentStep.content}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
