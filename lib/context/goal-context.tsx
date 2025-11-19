"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"
import { logger } from "@/lib/utils/logger"

type GoalType = "leads" | "calls" | "website-visits" | null
type GoalStatus = "idle" | "selecting" | "setup-in-progress" | "completed" | "error"

interface BusinessHoursDay {
  enabled: boolean
  start: string // HH:MM (24h)
  end: string   // HH:MM (24h)
}

type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

interface GoalFormData {
  // Leads - Basic Info
  id?: string
  name?: string
  type?: string
  
  // Leads - Form Builder Fields (for restoration)
  introHeadline?: string
  introDescription?: string
  privacyUrl?: string
  privacyLinkText?: string
  fields?: Array<{ id: string; type: "full_name" | "email" | "phone"; label: string; required: boolean }>
  
  // Leads - Thank You Page
  thankYouTitle?: string
  thankYouMessage?: string
  thankYouButtonText?: string
  thankYouButtonUrl?: string

  // Calls (minimal per Meta Call Ads requirements)
  phoneNumber?: string
  countryCode?: string

  // Website Visits (minimal: destination + optional display link)
  websiteUrl?: string
  displayLink?: string
}

interface GoalState {
  selectedGoal: GoalType
  status: GoalStatus
  formData: GoalFormData | null
  errorMessage?: string
}

interface GoalContextType {
  goalState: GoalState
  setSelectedGoal: (goal: GoalType) => void
  startSetup: () => void
  updateStatus: (status: GoalStatus) => void
  setFormData: (data: GoalFormData) => void
  setError: (message: string) => void
}

const GoalContext = createContext<GoalContextType | undefined>(undefined)

export function GoalProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaignContext()
  const [goalState, setGoalState] = useState<GoalState>({
    selectedGoal: null,
    status: "idle",
    formData: null,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedGoalState = useMemo(() => goalState, [goalState])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    // Load goal from campaign.initial_goal and formData from campaign.metadata
    const metadata = campaign.metadata as { formData?: GoalFormData } | null
    const savedGoalState: GoalState = {
      selectedGoal: (campaign.initial_goal as GoalType) || null,
      status: campaign.initial_goal ? "completed" : "idle",
      formData: metadata?.formData || null,
    }
    
    if (savedGoalState.selectedGoal) {
      logger.debug('GoalContext', '✅ Restoring goal state', savedGoalState)
      setGoalState(savedGoalState)
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function (save to campaign.metadata for formData, campaign.initial_goal for selectedGoal)
  const saveFn = useCallback(async (state: GoalState) => {
    if (!campaign?.id || !isInitialized) return
    
    // For goal changes, use the campaign update endpoint
    // Note: This is a simplified approach - full implementation would use proper API
    logger.debug('GoalContext', 'Goal save triggered', { selectedGoal: state.selectedGoal })
    // Actual save happens through specific API calls, not auto-save
  }, [campaign?.id, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedGoalState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  // Track previous goal to detect changes
  const prevGoalRef = useRef<GoalType>(null)

  // Notify AI when goal changes
  const notifyGoalChange = useCallback(async (
    conversationId: string,
    oldGoal: GoalType,
    newGoal: GoalType
  ) => {
    // Legacy: These routes no longer exist after cleanup
    // Goal changes are tracked through campaign state updates
    // AI context is rebuilt on each message via metadata
    logger.info('GoalContext', `Goal changed: ${oldGoal} → ${newGoal} (tracked via campaign state)`)
  }, [])

  // Detect goal changes and notify AI
  useEffect(() => {
    if (!campaign?.conversationId) return
    
    const currentGoal = goalState.selectedGoal
    const previousGoal = prevGoalRef.current
    
    // Goal changed (not initial load)
    if (previousGoal && currentGoal && previousGoal !== currentGoal) {
      logger.info('GoalContext', `Goal changed: ${previousGoal} → ${currentGoal}`)
      notifyGoalChange(campaign.conversationId, previousGoal, currentGoal)
    }
    
    prevGoalRef.current = currentGoal
  }, [goalState.selectedGoal, campaign?.conversationId, notifyGoalChange])

  const setSelectedGoal = (goal: GoalType) => {
    setGoalState(prev => ({ 
      ...prev, 
      selectedGoal: goal, 
      status: goal ? "selecting" : "idle",
      errorMessage: undefined
    }))
  }

  const startSetup = () => {
    setGoalState(prev => ({ ...prev, status: "setup-in-progress" }))
  }

  const updateStatus = (status: GoalStatus) => {
    setGoalState(prev => ({ ...prev, status }))
  }

  const setFormData = (data: GoalFormData) => {
    setGoalState(prev => ({ ...prev, formData: data, status: "completed" }))
  }

  const setError = (message: string) => {
    setGoalState(prev => ({ ...prev, errorMessage: message, status: "error" }))
  }

  return (
    <GoalContext.Provider 
      value={{ 
        goalState, 
        setSelectedGoal, 
        startSetup, 
        updateStatus, 
        setFormData, 
        setError
      }}
    >
      {children}
    </GoalContext.Provider>
  )
}

export function useGoal() {
  const context = useContext(GoalContext)
  if (context === undefined) {
    throw new Error("useGoal must be used within a GoalProvider")
  }
  return context
}

