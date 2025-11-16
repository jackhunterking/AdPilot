"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useCurrentAd } from "@/lib/context/current-ad-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"
import { logger } from "@/lib/utils/logger"

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
  isGeneratingCopy: boolean
}

interface AdCopyContextType {
  adCopyState: AdCopyState
  setSelectedCopyIndex: (index: number | null) => void
  setCustomCopyVariations: (variations: AdCopyVariation[]) => void
  setIsGeneratingCopy: (isGenerating: boolean) => void
  getActiveVariations: () => AdCopyVariation[] // Returns custom or default variations
  getSelectedCopy: () => AdCopyVariation // Returns the selected copy variation (or first if none selected)
  resetAdCopy: () => void
  isComplete: () => boolean
}

const AdCopyContext = createContext<AdCopyContextType | undefined>(undefined)

export function AdCopyProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaignContext()
  const { currentAd, updateAdSnapshot } = useCurrentAd()
  const [adCopyState, setAdCopyState] = useState<AdCopyState>({
    selectedCopyIndex: null,
    status: "idle",
    customCopyVariations: null, // Initialize with null (will use defaults)
    isGeneratingCopy: false,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedAdCopyState = useMemo(() => adCopyState, [adCopyState])

  // Load initial state from current ad's setup_snapshot
  useEffect(() => {
    if (!currentAd) {
      // No ad selected - reset to empty state
      logger.debug('AdCopyContext', 'No current ad - resetting to empty state')
      setAdCopyState({
        selectedCopyIndex: null,
        status: "idle",
        customCopyVariations: null,
        isGeneratingCopy: false,
      })
      setIsInitialized(true)
      return
    }
    
    logger.debug('AdCopyContext', `Loading state from ad ${currentAd.id}`)
    
    // Load from normalized ad_copy_variations table
    // Note: setup_snapshot column was removed - data is now in ad_copy_variations table
    // The use-draft-auto-save hook handles saving, this context just manages UI state
    
    // For now, start with empty state - copy will be loaded/generated via chat
    // TODO: Fetch from ad_copy_variations table via API if needed for restoration
    setAdCopyState({
      selectedCopyIndex: null,
      status: "idle",
      customCopyVariations: null,
      isGeneratingCopy: false,
    })
    
    setIsInitialized(true)
  }, [currentAd?.id, campaign?.id])

  // Save function - DEPRECATED: Auto-save hook handles persistence
  // This context manages UI state only, actual database saves handled by use-draft-auto-save
  const saveFn = useCallback(async (state: AdCopyState) => {
    if (!isInitialized) return
    
    // No-op: Saving is handled by use-draft-auto-save hook which uses /save endpoint
    // This prevents the context from trying to save to deprecated setup_snapshot column
    logger.debug('AdCopyContext', 'State updated (auto-save hook handles persistence)', {
      hasVariations: !!state.customCopyVariations,
      selectedIndex: state.selectedCopyIndex
    })
  }, [isInitialized])

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
    logger.debug('AdCopyContext', '📝 Setting custom copy variations', {
      count: limitedVariations.length,
      firstHeadline: limitedVariations[0]?.headline,
    })
    setAdCopyState(prev => ({
      ...prev,
      customCopyVariations: limitedVariations,
    }))
  }

  const setIsGeneratingCopy = (isGenerating: boolean) => {
    setAdCopyState(prev => ({
      ...prev,
      isGeneratingCopy: isGenerating,
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

  const resetAdCopy = () => {
    logger.debug('AdCopyContext', '🔄 Resetting ad copy state')
    setAdCopyState({
      selectedCopyIndex: null,
      status: "idle",
      customCopyVariations: null,
      isGeneratingCopy: false,
    })
  }

  const isComplete = () => {
    // Block completion if generation is in progress OR if no copy is selected
    return adCopyState.status === "completed" && !adCopyState.isGeneratingCopy
  }

  return (
    <AdCopyContext.Provider value={{ 
      adCopyState, 
      setSelectedCopyIndex, 
      setCustomCopyVariations,
      setIsGeneratingCopy,
      getActiveVariations,
      getSelectedCopy,
      resetAdCopy,
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


