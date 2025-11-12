"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"

type AudienceMode = "ai" | "manual"
type AudienceStatus = "idle" | "generating" | "gathering-info" | "setup-in-progress" | "completed" | "error"

interface TargetingOption {
  id: string
  name: string
}

interface Demographics {
  ageMin: number
  ageMax: number
  gender: "all" | "male" | "female"
  languages?: string[]
}

// For hydration/partial updates
type PartialDemographics = Partial<Demographics>

interface DetailedTargeting {
  interests: TargetingOption[]
  behaviors: TargetingOption[]
  connections: TargetingOption[]
}

interface AudienceTargeting {
  mode: AudienceMode
  // AI Advantage+ mode
  advantage_plus_enabled?: boolean
  // Manual mode fields
  description?: string // User's natural language input
  demographics?: Partial<Demographics>
  detailedTargeting?: Partial<DetailedTargeting>
}

interface AudienceState {
  status: AudienceStatus
  targeting: AudienceTargeting
  errorMessage?: string
  isSelected: boolean // Track if user confirmed/selected this audience
}

interface AudienceContextType {
  audienceState: AudienceState
  setAudienceTargeting: (targeting: Partial<AudienceTargeting>) => void
  updateStatus: (status: AudienceStatus) => void
  setError: (message: string) => void
  resetAudience: () => void
  setSelected: (selected: boolean) => void
  setManualDescription: (description: string) => void
  setDemographics: (demographics: Partial<Demographics>) => void
  setDetailedTargeting: (detailedTargeting: Partial<DetailedTargeting>) => void
  setConfirmedParameters: (demographics: Demographics, interests: TargetingOption[], behaviors: TargetingOption[]) => void
  addInterest: (interest: TargetingOption) => void
  removeInterest: (interestId: string) => void
  addBehavior: (behavior: TargetingOption) => void
  removeBehavior: (behaviorId: string) => void
  addConnection: (connection: TargetingOption) => void
  removeConnection: (connectionId: string) => void
}

const AudienceContext = createContext<AudienceContextType | undefined>(undefined)

export function AudienceProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaignContext()
  const [audienceState, setAudienceState] = useState<AudienceState>({
    status: "idle",
    targeting: {
      mode: "ai", // Default to AI mode
    },
    isSelected: false,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedAudienceState = useMemo(() => audienceState, [audienceState])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    // campaign_states is 1-to-1 object, not array
    const savedData = campaign.campaign_states?.audience_data as unknown as AudienceState | null
    if (savedData) {
      console.log('[AudienceContext] ✅ Restoring audience state:', savedData);
      setAudienceState(savedData)
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function
  const saveFn = useCallback(async (state: AudienceState) => {
    if (!campaign?.id || !isInitialized) return
    await saveCampaignState('audience_data', state as unknown as Record<string, unknown>)
  }, [campaign?.id, saveCampaignState, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedAudienceState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  const setAudienceTargeting = (targeting: Partial<AudienceTargeting>) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: { ...prev.targeting, ...targeting },
      status: "completed",
      isSelected: true,
      errorMessage: undefined
    }))
  }

  const updateStatus = (status: AudienceStatus) => {
    setAudienceState(prev => ({ ...prev, status }))
  }

  const setError = (message: string) => {
    setAudienceState(prev => ({ ...prev, errorMessage: message, status: "error" }))
  }

  const resetAudience = () => {
    setAudienceState({
      status: "idle",
      targeting: {
        mode: "ai",
      },
      errorMessage: undefined,
      isSelected: false,
    })
  }

  const setSelected = (selected: boolean) => {
    setAudienceState(prev => ({ ...prev, isSelected: selected }))
  }

  const setManualDescription = (description: string) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: { ...prev.targeting, description }
    }))
  }

  const setDemographics = (demographics: Partial<Demographics>) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: { 
        ...prev.targeting, 
        demographics: {
          ...prev.targeting.demographics,
          ...demographics
        }
      }
    }))
  }

  const setDetailedTargeting = (detailedTargeting: Partial<DetailedTargeting>) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        detailedTargeting: {
          interests: prev.targeting.detailedTargeting?.interests || [],
          behaviors: prev.targeting.detailedTargeting?.behaviors || [],
          connections: prev.targeting.detailedTargeting?.connections || [],
          ...detailedTargeting
        }
      }
    }))
  }

  const addInterest = (interest: TargetingOption) => {
    setAudienceState(prev => {
      const current = prev.targeting.detailedTargeting?.interests || []
      if (current.some(i => i.id === interest.id)) return prev
      return {
        ...prev,
        targeting: {
          ...prev.targeting,
          detailedTargeting: {
            ...prev.targeting.detailedTargeting,
            interests: [...current, interest],
            behaviors: prev.targeting.detailedTargeting?.behaviors || [],
            connections: prev.targeting.detailedTargeting?.connections || []
          }
        }
      }
    })
  }

  const removeInterest = (interestId: string) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        detailedTargeting: {
          ...prev.targeting.detailedTargeting,
          interests: prev.targeting.detailedTargeting?.interests?.filter(i => i.id !== interestId) || [],
          behaviors: prev.targeting.detailedTargeting?.behaviors || [],
          connections: prev.targeting.detailedTargeting?.connections || []
        }
      }
    }))
  }

  const addBehavior = (behavior: TargetingOption) => {
    setAudienceState(prev => {
      const current = prev.targeting.detailedTargeting?.behaviors || []
      if (current.some(b => b.id === behavior.id)) return prev
      return {
        ...prev,
        targeting: {
          ...prev.targeting,
          detailedTargeting: {
            ...prev.targeting.detailedTargeting,
            interests: prev.targeting.detailedTargeting?.interests || [],
            behaviors: [...current, behavior],
            connections: prev.targeting.detailedTargeting?.connections || []
          }
        }
      }
    })
  }

  const removeBehavior = (behaviorId: string) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        detailedTargeting: {
          ...prev.targeting.detailedTargeting,
          interests: prev.targeting.detailedTargeting?.interests || [],
          behaviors: prev.targeting.detailedTargeting?.behaviors?.filter(b => b.id !== behaviorId) || [],
          connections: prev.targeting.detailedTargeting?.connections || []
        }
      }
    }))
  }

  const addConnection = (connection: TargetingOption) => {
    setAudienceState(prev => {
      const current = prev.targeting.detailedTargeting?.connections || []
      if (current.some(c => c.id === connection.id)) return prev
      return {
        ...prev,
        targeting: {
          ...prev.targeting,
          detailedTargeting: {
            ...prev.targeting.detailedTargeting,
            interests: prev.targeting.detailedTargeting?.interests || [],
            behaviors: prev.targeting.detailedTargeting?.behaviors || [],
            connections: [...current, connection]
          }
        }
      }
    })
  }

  const removeConnection = (connectionId: string) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        detailedTargeting: {
          ...prev.targeting.detailedTargeting,
          interests: prev.targeting.detailedTargeting?.interests || [],
          behaviors: prev.targeting.detailedTargeting?.behaviors || [],
          connections: prev.targeting.detailedTargeting?.connections?.filter(c => c.id !== connectionId) || []
        }
      }
    }))
  }

  const setConfirmedParameters = (demographics: Demographics, interests: TargetingOption[], behaviors: TargetingOption[]) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        mode: 'manual',
        demographics,
        detailedTargeting: {
          interests,
          behaviors,
          connections: []
        }
      },
      status: 'completed',
      isSelected: true
    }))
    // Emit event for success card in chat
    window.dispatchEvent(new CustomEvent('manualTargetingConfirmed'))
  }

  // Auto-advance when AI targeting completes, but avoid hydration-induced idle→completed jumps
  const prevStatus = useRef<AudienceStatus>(audienceState.status)
  useEffect(() => {
    const transitionedToCompleted = audienceState.status === "completed" && prevStatus.current !== "completed"
    const notFromIdleHydration = prevStatus.current !== "idle"
    const isAIMode = audienceState.targeting?.mode === "ai"
    if (transitionedToCompleted && notFromIdleHydration && isAIMode) {
      window.dispatchEvent(new CustomEvent("autoAdvanceStep"))
    }
    prevStatus.current = audienceState.status
  }, [audienceState.status, audienceState.targeting?.mode])

  return (
    <AudienceContext.Provider 
      value={{ 
        audienceState, 
        setAudienceTargeting,
        updateStatus, 
        setError, 
        resetAudience,
        setSelected,
        setManualDescription,
        setDemographics,
        setDetailedTargeting,
        setConfirmedParameters,
        addInterest,
        removeInterest,
        addBehavior,
        removeBehavior,
        addConnection,
        removeConnection
      }}
    >
      {children}
    </AudienceContext.Provider>
  )
}

export function useAudience() {
  const context = useContext(AudienceContext)
  if (context === undefined) {
    throw new Error("useAudience must be used within an AudienceProvider")
  }
  return context
}


