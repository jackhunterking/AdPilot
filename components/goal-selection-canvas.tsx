"use client"

import { Phone, Users, CheckCircle2, Loader2, Lock, Flag, Filter, FileText, Check, AlertCircle, Globe, Facebook } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useGoal } from "@/lib/context/goal-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { LeadFormSetup } from "@/components/forms/lead-form-setup"
import { FormSummaryCard } from "@/components/launch/form-summary-card"
import { CallConfiguration } from "@/components/forms/call-configuration"
import { WebsiteConfiguration } from "@/components/forms/website-configuration"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { cn } from "@/lib/utils"

interface GoalSelectionCanvasProps {
  variant?: "step" | "summary"
}

export function GoalSelectionCanvas({ variant = "step" }: GoalSelectionCanvasProps = {}) {
  const { goalState, setSelectedGoal, resetGoal, setFormData } = useGoal()
  const { isPublished } = useAdPreview()
  const { metaStatus, paymentStatus, refreshStatus, isReady } = useMetaConnection()
  const metaActions = useMetaActions()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showMetaRequiredDialog, setShowMetaRequiredDialog] = useState(false)
  const [pendingGoal, setPendingGoal] = useState<"leads" | "calls" | "website-visits" | null>(null)
  const isSummary = variant === "summary"
  
  // Removed AI-triggered setup; inline UI is used instead

  // Handle goal selection with Meta connection check
  const handleGoalSelect = (goal: "leads" | "calls" | "website-visits") => {
    // For leads, proceed directly without Meta check (check happens at destination selection)
    if (goal === 'leads') {
      console.log('[GoalSelectionCanvas] Leads selected, proceeding to destination selection')
      setSelectedGoal(goal)
      return
    }
    
    // For calls and website-visits, check if Meta is connected
    if (metaStatus !== 'connected') {
      console.log('[GoalSelectionCanvas] Meta not connected, showing dialog')
      setPendingGoal(goal)
      setShowMetaRequiredDialog(true)
      return
    }
    
    // Proceed with goal selection
    console.log('[GoalSelectionCanvas] Meta connected, proceeding with goal:', goal)
    setSelectedGoal(goal)
  }

  // Handle Meta connection click from dialog
  const handleConnectMeta = () => {
    setIsConnecting(true)
    setShowMetaRequiredDialog(false)
    metaActions.connect()
    // Reset connecting state after popup opens (1 second)
    setTimeout(() => setIsConnecting(false), 1000)
  }

  // When Meta connection completes and we have a pending goal, proceed with selection
  useEffect(() => {
    if (metaStatus === 'connected' && pendingGoal) {
      console.log('[GoalSelectionCanvas] Meta connected, proceeding with pending goal:', pendingGoal)
      setSelectedGoal(pendingGoal)
      setPendingGoal(null)
    }
  }, [metaStatus, pendingGoal, setSelectedGoal])

  // Auto-advance to next step when this step transitions to completed during this session
  const prevStatusRef = useRef(goalState.status)
  useEffect(() => {
    const prev = prevStatusRef.current
    const curr = goalState.status
    if (prev !== 'completed' && curr === 'completed' && goalState.selectedGoal === 'leads') {
      // Let state settle, then signal stepper to advance
      setTimeout(() => {
        try {
          window.dispatchEvent(new Event('autoAdvanceStep'))
        } catch {
          // ignore
        }
      }, 0)
    }
    prevStatusRef.current = curr
  }, [goalState.status, goalState.selectedGoal])

  // If published, show locked state regardless of goal setup status
  if (isPublished) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", isSummary && "p-6")}
      >
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold">Goal</h2>
            <p className="text-muted-foreground">
              This ad has been published. Goals cannot be changed once an ad is live.
            </p>
          </div>
          
          {/* Goal Configuration Card */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Flag className="h-4 w-4 text-orange-600" />
                </div>
                <h3 className="font-semibold text-lg">Goal Configuration</h3>
              </div>
              <Badge className="bg-orange-600 text-white">
                <Lock className="h-3 w-3 mr-1" />
                Published
              </Badge>
            </div>

            {/* Configuration Details */}
            <div className="space-y-2">
              {/* Objective */}
              <div className="flex items-center justify-between p-3 rounded-lg panel-surface border border-border">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Filter className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Goal</p>
                    <p className="font-medium text-sm capitalize">{goalState.selectedGoal || "Leads"}</p>
                  </div>
                </div>
                <Lock className="h-4 w-4 text-orange-600" />
              </div>

              {/* Form - Combined with Lead Type */}
              {goalState.formData?.name && (
                <div className="flex items-center justify-between p-3 rounded-lg panel-surface border border-border">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Instant Form</p>
                      <p className="font-medium text-sm truncate">{goalState.formData.name}</p>
                    </div>
                  </div>
                  <Lock className="h-4 w-4 text-orange-600" />
                </div>
              )}
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-left text-sm space-y-1">
                <p className="font-medium text-orange-700 dark:text-orange-400">Goal is Locked</p>
                <p className="text-orange-600 dark:text-orange-300 text-xs">
                  To modify goals, you must first unpublish or create a new ad campaign.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // LEADS: Always show builder for all statuses (when not published)
  if (goalState.selectedGoal === 'leads') {
    return (
      <div className={cn("h-full", isSummary && "h-auto")}
      >
        <LeadFormSetup
          onFormSelected={(data) => {
            setFormData({ id: data.id, name: data.name })
          }}
          onChangeGoal={resetGoal}
        />
      </div>
    )
  }

  // Add window focus listener to refresh status when popup closes
  useEffect(() => {
    const handleFocus = () => {
      // When window regains focus (popup closed), refresh status
      refreshStatus()
      // If now ready, auto-advance to show goal options
      if (isReady) {
        window.dispatchEvent(new Event('autoAdvanceStep'))
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshStatus, isReady])

  // Meta connection gate: if user reaches goal step without connection, show prompt
  if (goalState.status === "idle" && !isReady) {
    const handleConnectClick = () => {
      setIsConnecting(true)
      metaActions.connect()
      // Reset connecting state after popup opens (1 second)
      setTimeout(() => setIsConnecting(false), 1000)
    }

    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", isSummary && "p-6")}>
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold">Connect Meta to Set Goal</h2>
            <p className="text-muted-foreground">
              Goals require access to your Meta business account. Connect Facebook & Instagram to continue.
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleConnectClick}
            disabled={isConnecting}
            className="w-full gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Facebook className="h-5 w-5" />
                Connect Meta & Instagram
              </>
            )}
          </Button>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              For lead generation goals, we need to access your Meta instant forms and conversion tracking.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Initial state - no goal selected (only shown when Meta IS connected)
  if (goalState.status === "idle") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", isSummary && "p-6")}
      >
        <div className="max-w-3xl w-full space-y-8">
          <div className="grid grid-cols-3 gap-6">
            {/* Leads Card */}
            <div className="group relative flex flex-col items-center p-6 rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
                <h3 className="text-lg font-semibold">Leads</h3>
                <p className="text-xs text-muted-foreground">
                  Collect info from potential customers
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleGoalSelect("leads")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 mt-auto"
              >
                Get Leads
              </Button>
            </div>

            {/* Calls Card */}
            <div className="group relative flex flex-col items-center p-6 rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4">
                <Phone className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
                <h3 className="text-lg font-semibold">Calls</h3>
                <p className="text-xs text-muted-foreground">
                  Get people to call your business directly
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleGoalSelect("calls")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 mt-auto"
              >
                Get Calls
              </Button>
            </div>
            
            {/* Website Visits Card */}
            <div className="group relative flex flex-col items-center p-6 rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
                <h3 className="text-lg font-semibold">Website visits</h3>
                <p className="text-xs text-muted-foreground">
                  Drive traffic to your website
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleGoalSelect("website-visits")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 mt-auto"
              >
                Get visits
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Goal selected - show setup button
  if (goalState.status === "selecting") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", isSummary && "p-6")}
      >
        <div className="max-w-2xl w-full space-y-8">
          {/* Selected goal hero card removed once a goal is chosen to keep the canvas clean */}

          {/* Inline Setup UI per goal (Leads handled above always) */}

          {goalState.selectedGoal === 'calls' && (
            <div className="mt-2">
              <CallConfiguration />
            </div>
          )}

          {goalState.selectedGoal === 'website-visits' && (
            <div className="mt-2">
              <WebsiteConfiguration />
            </div>
          )}

          {!isSummary && (
            <div className="flex justify-center gap-4 pt-6">
              <Button variant="outline" size="lg" onClick={resetGoal}>
                Change Goal
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Setup in progress
  if (goalState.status === "setup-in-progress") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", isSummary && "p-6")}
      >
        <div className="max-w-xl w-full space-y-6 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setting up your goal...</h2>
            <p className="text-muted-foreground">
              AI is configuring your goal setup. This may take a few seconds.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Completed setup: show saved goal summary (calls or website)
  if (goalState.status === "completed" && (goalState.selectedGoal === 'calls' || goalState.selectedGoal === 'website-visits')) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", isSummary && "p-6")}
      >
        <div className="max-w-2xl w-full space-y-6">
          <FormSummaryCard mode="inline" />
        </div>
      </div>
    )
  }

  // Error state
  if (goalState.status === "error") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", isSummary && "p-6")}
      >
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setup Failed</h2>
            <p className="text-muted-foreground">
              {goalState.errorMessage || "Setup couldn't complete. Try again or ask AI for help."}
            </p>
          </div>
          
          <Button
            size="lg"
            onClick={resetGoal}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Meta Connection Required Dialog */}
      <Dialog open={showMetaRequiredDialog} onOpenChange={setShowMetaRequiredDialog}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Facebook className="h-6 w-6 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">Connect Meta Account</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-muted-foreground mb-6">
            You need to connect your Meta account to select a campaign goal. This will allow you to publish ads to Facebook and Instagram.
          </DialogDescription>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setShowMetaRequiredDialog(false)
                setPendingGoal(null)
              }}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={handleConnectMeta}
              disabled={isConnecting}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Facebook className="h-4 w-4" />
                  Connect Meta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
