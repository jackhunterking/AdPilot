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
  getSelectedCopy: () => AdCopyVariation // Returns the selected copy variation (or first if none selected)
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
      // Limit to first 3 variations if restoring old data with more than 3
      const limitedVariations = savedData.customCopyVariations 
        ? savedData.customCopyVariations.slice(0, 3)
        : null
      console.log('[AdCopyContext] ✅ Restoring ad copy state:', {
        selectedIndex: savedData.selectedCopyIndex,
        hasCustomVariations: !!limitedVariations,
        customVariationsCount: limitedVariations?.length || 0,
      });
      // Reset selected index if it's out of range (greater than 2 for 3 variations)
      const validSelectedIndex = savedData.selectedCopyIndex != null && savedData.selectedCopyIndex < 3
        ? savedData.selectedCopyIndex
        : null
      
      setAdCopyState({
        selectedCopyIndex: validSelectedIndex,
        status: savedData.status || "idle",
        customCopyVariations: limitedVariations,
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
    // Always limit to first 3 variations for consistency
    const limitedVariations = variations.slice(0, 3)
    console.log('[AdCopyContext] 📝 Setting custom copy variations:', {
      count: limitedVariations.length,
      firstHeadline: limitedVariations[0]?.headline,
    })
    setAdCopyState(prev => ({
      ...prev,
      customCopyVariations: limitedVariations,
    }))
  }

  const getActiveVariations = (): AdCopyVariation[] => {
    // Return custom variations if available, otherwise return defaults
    // Always limit to first 3 variations for consistency
    const variations = adCopyState.customCopyVariations || adCopyVariations
    return variations.slice(0, 3)
  }

  const getSelectedCopy = (): AdCopyVariation => {
    // Returns the selected copy variation, or the first variation if none selected
    // This is the SINGLE SOURCE OF TRUTH for which copy is active
    const variations = getActiveVariations()
    const selectedIndex = adCopyState.selectedCopyIndex ?? 0
    const selectedVariation = variations[selectedIndex] || variations[0]
    
    // Guarantee we always return a valid variation (should never happen but TypeScript needs assurance)
    if (!selectedVariation) {
      return {
        id: "fallback",
        primaryText: "Discover our amazing services and see how we can help you achieve your goals today.",
        description: "Learn more about what we offer",
        headline: "Get Started Today"
      }
    }
    
    return selectedVariation
  }

  const isComplete = () => adCopyState.status === "completed"

  return (
    <AdCopyContext.Provider value={{ 
      adCopyState, 
      setSelectedCopyIndex, 
      setCustomCopyVariations,
      getActiveVariations,
      getSelectedCopy,
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


