"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"

interface AdCopyVariation {
  id: string
  primaryText: string
  description: string
  headline: string
  overlay?: {
    headline?: string
    offer?: string
    body?: string
    density?: 'none' | 'light' | 'medium' | 'heavy' | 'text-only'
  }
}

interface AdCopyState {
  selectedCopyIndex: number | null
  status: "idle" | "completed"
  customCopyVariations: AdCopyVariation[] | null // Store custom/AI-generated variations
}

interface AdCopyContextType {
  adCopyState: AdCopyState
  setSelectedCopyIndex: (index: number | null) => void
  setCustomCopyVariations: (variations: AdCopyVariation[]) => void
  getActiveVariations: () => AdCopyVariation[] // Returns custom or default variations
  isComplete: () => boolean
}

const AdCopyContext = createContext<AdCopyContextType | undefined>(undefined)

export function AdCopyProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaignContext()
  const [adCopyState, setAdCopyState] = useState<AdCopyState>({
    selectedCopyIndex: null,
    status: "idle",
    customCopyVariations: null, // Initialize with null (will use defaults)
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedAdCopyState = useMemo(() => adCopyState, [adCopyState])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    // campaign_states is 1-to-1 object, not array
    const savedData = campaign.campaign_states?.ad_copy_data as unknown as AdCopyState | null
    if (savedData) {
      console.log('[AdCopyContext] ✅ Restoring ad copy state:', {
        selectedIndex: savedData.selectedCopyIndex,
        hasCustomVariations: !!savedData.customCopyVariations,
        customVariationsCount: savedData.customCopyVariations?.length || 0,
      });
      setAdCopyState({
        selectedCopyIndex: savedData.selectedCopyIndex ?? null,
        status: savedData.status || "idle",
        customCopyVariations: savedData.customCopyVariations || null,
      })
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function
  const saveFn = useCallback(async (state: AdCopyState) => {
    if (!campaign?.id || !isInitialized) return
    await saveCampaignState('ad_copy_data', state as unknown as Record<string, unknown>)
  }, [campaign?.id, saveCampaignState, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedAdCopyState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  const setSelectedCopyIndex = (index: number | null) => {
    setAdCopyState(prev => ({
      ...prev,
      selectedCopyIndex: index,
      status: index !== null ? "completed" : "idle",
    }))
  }

  const setCustomCopyVariations = (variations: AdCopyVariation[]) => {
    console.log('[AdCopyContext] 📝 Setting custom copy variations:', {
      count: variations.length,
      firstHeadline: variations[0]?.headline,
    })
    setAdCopyState(prev => ({
      ...prev,
      customCopyVariations: variations,
    }))
  }

  const getActiveVariations = (): AdCopyVariation[] => {
    // Return custom variations if available, otherwise return defaults
    return adCopyState.customCopyVariations || adCopyVariations
  }

  const isComplete = () => adCopyState.status === "completed"

  return (
    <AdCopyContext.Provider value={{ 
      adCopyState, 
      setSelectedCopyIndex, 
      setCustomCopyVariations,
      getActiveVariations,
      isComplete 
    }}>
      {children}
    </AdCopyContext.Provider>
  )
}

export function useAdCopy() {
  const context = useContext(AdCopyContext)
  if (context === undefined) {
    throw new Error("useAdCopy must be used within an AdCopyProvider")
  }
  return context
}

// Mock ad copy variations
export const adCopyVariations: AdCopyVariation[] = [
  {
    id: "copy_1",
    primaryText: "Transform your business with cutting-edge solutions designed for growth. Join thousands of successful companies already seeing results.",
    description: "Limited time offer - Get 30% off your first month",
    headline: "Grow Your Business Today"
  },
  {
    id: "copy_2",
    primaryText: "Discover the power of innovation. Our proven approach helps you reach your goals faster and more efficiently than ever before.",
    description: "Start your free trial - No credit card required",
    headline: "Innovation Meets Results"
  },
  {
    id: "copy_3",
    primaryText: "Join the revolution. Experience the difference that quality and expertise can make in your journey to success.",
    description: "Special offer for new customers - Act now",
    headline: "Your Success Starts Here"
  }
]


