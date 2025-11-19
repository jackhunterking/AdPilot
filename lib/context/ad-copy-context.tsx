"use client"

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useCurrentAd } from "@/lib/context/current-ad-context"
import { useAdService } from "@/lib/services/service-provider"
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
  const { currentAd } = useCurrentAd()
  const [adCopyState, setAdCopyState] = useState<AdCopyState>({
    selectedCopyIndex: null,
    status: "idle",
    customCopyVariations: null, // Initialize with null (will use defaults)
    isGeneratingCopy: false,
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [contextAdId, setContextAdId] = useState<string | null>(null)  // Track which ad this context serves

  // Load initial state from backend (single source of truth)
  useEffect(() => {
    // If ad ID changed, reset state immediately to prevent contamination
    if (contextAdId && currentAd?.id && currentAd.id !== contextAdId) {
      logger.info('AdCopyContext', 'Ad changed - resetting context state', {
        oldAd: contextAdId,
        newAd: currentAd.id
      })
      setAdCopyState({
        selectedCopyIndex: null,
        status: "idle",
        customCopyVariations: null,
        isGeneratingCopy: false,
      })
      setContextAdId(null)
      setIsInitialized(false)
    }
    
    if (!currentAd) {
      // No ad selected - reset to empty state
      logger.debug('AdCopyContext', 'No current ad - resetting to empty state')
      setAdCopyState({
        selectedCopyIndex: null,
        status: "idle",
        customCopyVariations: null,
        isGeneratingCopy: false,
      })
      setContextAdId(null)
      setIsInitialized(true)
      return
    }
    
    logger.debug('AdCopyContext', `Loading copy from backend for ad ${currentAd.id}`)
    setContextAdId(currentAd.id)  // Mark context as serving this ad
    
    const loadCopyFromBackend = async () => {
      try {
        logger.debug('AdCopyContext', `Loading copy from backend for ad ${currentAd.id}`)
        
        // Use service layer instead of direct fetch (microservices pattern)
        const adService = useAdService()
        const result = await adService.getSnapshot.execute(currentAd.id)
        
        if (!result.success || !result.data) {
          logger.warn('AdCopyContext', 'Failed to load snapshot, starting empty')
          setAdCopyState({ selectedCopyIndex: null, status: "idle", customCopyVariations: null, isGeneratingCopy: false })
          setIsInitialized(true)
          return
        }
        
        const snapshot = result.data
        
        if (snapshot?.copy?.variations && snapshot.copy.variations.length > 0) {
          logger.info('AdCopyContext', `✅ Loaded ${snapshot.copy.variations.length} copy variations from backend`)
          const variations = snapshot.copy.variations.map((v, idx: number) => ({
            id: `variation-${idx}`,
            headline: v.headline,
            primaryText: v.primaryText,
            description: v.description || '',
            overlay: undefined // AdSnapshot doesn't include overlay
          }))
          
          setAdCopyState({
            selectedCopyIndex: snapshot.copy.selectedIndex ?? 0,
            status: "completed",
            customCopyVariations: variations,
            isGeneratingCopy: false,
          })
        } else {
          logger.debug('AdCopyContext', 'No copy in backend, starting empty (new ad)')
          setAdCopyState({ selectedCopyIndex: null, status: "idle", customCopyVariations: null, isGeneratingCopy: false })
        }
        
        setIsInitialized(true)
      } catch (err) {
        logger.error('AdCopyContext', 'Error loading copy from backend', err)
        setAdCopyState({ selectedCopyIndex: null, status: "idle", customCopyVariations: null, isGeneratingCopy: false })
        setIsInitialized(true)
      }
    }
    
    loadCopyFromBackend()
  }, [currentAd?.id, campaign?.id, contextAdId])

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


