"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"

type GoalType = "leads" | "calls" | "website-visits" | null
type GoalStatus = "idle" | "selecting" | "setup-in-progress" | "completed" | "error"

interface BusinessHoursDay {
  enabled: boolean
  start: string // HH:MM (24h)
  end: string   // HH:MM (24h)
}

type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

interface GoalFormData {
  // Leads
  id?: string
  name?: string
  type?: string
  fields?: string[]

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
  resetGoal: () => void
}

const GoalContext = createContext<GoalContextType | undefined>(undefined)

export function GoalProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaignContext()
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
    
    // campaign_states is 1-to-1 object, not array
    const savedData = campaign.campaign_states?.goal_data as unknown as GoalState | null
    if (savedData) {
      console.log('[GoalContext] ✅ Restoring goal state:', savedData);
      setGoalState(savedData)
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function
  const saveFn = useCallback(async (state: GoalState) => {
    if (!campaign?.id || !isInitialized) return
    await saveCampaignState('goal_data', state as unknown as Record<string, unknown>)
  }, [campaign?.id, saveCampaignState, isInitialized])

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
    try {
      // Update conversation metadata with new goal
      await fetch('/api/conversations/update-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, goalType: newGoal })
      })
      
      // Inject system message to notify AI
      const systemMessage = `[SYSTEM NOTIFICATION] The campaign goal has been changed from "${oldGoal}" to "${newGoal}". All future creative suggestions, image generations, and recommendations should now align with the ${newGoal} goal.`
      
      await fetch('/api/conversations/inject-system-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: systemMessage })
      })
      
      console.log(`[GoalContext] Notified AI of goal change: ${oldGoal} → ${newGoal}`)
    } catch (error) {
      console.error('[GoalContext] Failed to notify AI of goal change:', error)
    }
  }, [])

  // Detect goal changes and notify AI
  useEffect(() => {
    if (!campaign?.conversationId) return
    
    const currentGoal = goalState.selectedGoal
    const previousGoal = prevGoalRef.current
    
    // Goal changed (not initial load)
    if (previousGoal && currentGoal && previousGoal !== currentGoal) {
      console.log(`[GoalContext] Goal changed: ${previousGoal} → ${currentGoal}`)
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

  const resetGoal = () => {
    setGoalState({
      selectedGoal: null,
      status: "idle",
      formData: null,
      errorMessage: undefined,
    })
    // Navigate to goal step when resetting, allowing navigation even if step is incomplete
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'goal', force: true } }))
    }
  }

  return (
    <GoalContext.Provider 
      value={{ 
        goalState, 
        setSelectedGoal, 
        startSetup, 
        updateStatus, 
        setFormData, 
        setError, 
        resetGoal 
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

