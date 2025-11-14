"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useCurrentAd } from "@/lib/context/current-ad-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"
import { logger } from "@/lib/utils/logger"

interface AdContent {
  imageUrl?: string // Legacy single image support
  imageVariations?: string[] // Array of 3 variation URLs
  baseImageUrl?: string // Original base image
  headline: string
  body: string
  cta: string
}

interface CreativeVariation {
  gradient: string
  title: string
}

interface AdPreviewContextType {
  adContent: AdContent | null
  setAdContent: React.Dispatch<React.SetStateAction<AdContent | null>>
  isPublished: boolean
  setIsPublished: (published: boolean) => void
  selectedCreativeVariation: CreativeVariation | null
  setSelectedCreativeVariation: (variation: CreativeVariation | null) => void
  selectedImageIndex: number | null
  setSelectedImageIndex: (index: number | null) => void
  loadingVariations: boolean[]
  generateImageVariations: (baseImageUrl: string, campaignId?: string) => Promise<void>
  resetAdPreview: () => void
  isSaving: boolean
  lastSaved: Date | null
  saveError: Error | null
}

const AdPreviewContext = createContext<AdPreviewContextType | undefined>(undefined)

export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaignContext()
  const { currentAd, updateAdSnapshot } = useCurrentAd()
  const [adContent, setAdContent] = useState<AdContent | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [selectedCreativeVariation, setSelectedCreativeVariation] = useState<CreativeVariation | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loadingVariations] = useState<boolean[]>([false, false, false])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  
  // Track previous save config mode to only log transitions
  const prevSaveConfigModeRef = useRef<'CRITICAL' | 'NORMAL' | null>(null)

  // CRITICAL: Memoize state to prevent unnecessary recreations
  const adPreviewState = useMemo(() => ({ 
    adContent, 
    isPublished, 
    selectedCreativeVariation,
    selectedImageIndex,
  }), [adContent, isPublished, selectedCreativeVariation, selectedImageIndex])

  // Load initial state from current ad's setup_snapshot
  useEffect(() => {
    if (!currentAd) {
      // No ad selected - reset to empty state
      logger.debug('AdPreviewContext', 'No current ad - resetting to empty state')
      setAdContent(null)
      setIsPublished(false)
      setSelectedCreativeVariation(null)
      setSelectedImageIndex(null)
      setIsInitialized(true)
      return
    }
    
    logger.debug('AdPreviewContext', `Loading state from ad ${currentAd.id}`)
    
    // Load from ad's setup_snapshot first (new architecture)
    const creativeSnapshot = currentAd.setup_snapshot?.creative
    
    if (creativeSnapshot) {
      logger.debug('AdPreviewContext', '✅ Loading from ad snapshot', {
        hasImageUrl: !!creativeSnapshot.imageUrl,
        imageVariationsCount: creativeSnapshot.imageVariations?.length || 0
      })
      
      // Construct AdContent from snapshot
      if (creativeSnapshot.imageUrl || creativeSnapshot.imageVariations) {
        setAdContent({
          imageUrl: creativeSnapshot.imageUrl,
          imageVariations: creativeSnapshot.imageVariations,
          baseImageUrl: creativeSnapshot.baseImageUrl,
          headline: '', // Will be populated from copy context
          body: '',
          cta: 'Learn More'
        })
      }
      
      if (creativeSnapshot.selectedImageIndex !== undefined) {
        setSelectedImageIndex(creativeSnapshot.selectedImageIndex ?? null)
      }
      
      if (creativeSnapshot.selectedCreativeVariation) {
        setSelectedCreativeVariation(creativeSnapshot.selectedCreativeVariation)
      }
    } else if (campaign?.campaign_states) {
      // Fallback to campaign_states for backward compatibility
      logger.debug('AdPreviewContext', '⚠️ Falling back to campaign_states (legacy)')
      
      const savedData = campaign.campaign_states?.ad_preview_data as unknown as {
        adContent?: AdContent | null;
        isPublished?: boolean;
        selectedCreativeVariation?: CreativeVariation | null;
        selectedImageIndex?: number | null;
      } | null
      
      if (savedData) {
        if (savedData.adContent) setAdContent(savedData.adContent)
        if (savedData.isPublished !== undefined) setIsPublished(savedData.isPublished)
        if (savedData.selectedCreativeVariation) setSelectedCreativeVariation(savedData.selectedCreativeVariation)
        if (savedData.selectedImageIndex !== undefined) setSelectedImageIndex(savedData.selectedImageIndex ?? null)
      }
    } else {
      logger.debug('AdPreviewContext', 'No snapshot or campaign_states - starting fresh')
    }
    
    setIsInitialized(true)
  }, [currentAd?.id, campaign?.id])

  // Save function with proper return type
  const saveFn = useCallback(async (state: typeof adPreviewState) => {
    if (!isInitialized) return
    
    // Save to current ad's snapshot (new architecture)
    if (currentAd) {
      logger.debug('AdPreviewContext', '💾 Saving to ad snapshot', {
        adId: currentAd.id,
        hasImageVariations: !!state.adContent?.imageVariations?.length,
        imageCount: state.adContent?.imageVariations?.length || 0,
      })
      
      try {
        await updateAdSnapshot({
          creative: {
            imageUrl: state.adContent?.imageUrl,
            imageVariations: state.adContent?.imageVariations,
            baseImageUrl: state.adContent?.baseImageUrl,
            selectedImageIndex: state.selectedImageIndex,
            selectedCreativeVariation: state.selectedCreativeVariation
          }
        })
      } catch (error) {
        logger.error('AdPreviewContext', 'Failed to save to ad snapshot', error)
        throw error
      }
    } else if (campaign?.id) {
      // Fallback to campaign_states for backward compatibility
      logger.debug('AdPreviewContext', '⚠️ Saving to campaign_states (legacy fallback)')
      await saveCampaignState('ad_preview_data', state)
    }
  }, [currentAd, campaign?.id, updateAdSnapshot, saveCampaignState, isInitialized])

  // Memoize save config to force CRITICAL mode when images present
  // This ensures images save immediately (0ms) instead of 300ms debounce
  const saveConfig = useMemo(() => {
    const hasImages = !!(adContent?.imageVariations?.length || adContent?.baseImageUrl)
    return hasImages ? AUTO_SAVE_CONFIGS.CRITICAL : AUTO_SAVE_CONFIGS.NORMAL
  }, [adContent?.imageVariations?.length, adContent?.baseImageUrl])
  
  // Track mode changes in a separate effect to avoid logging on every render
  useEffect(() => {
    const hasImages = !!(adContent?.imageVariations?.length || adContent?.baseImageUrl)
    const currentMode = hasImages ? 'CRITICAL' : 'NORMAL'
    
    // Only log when mode actually transitions (not on initial mount or same mode)
    if (prevSaveConfigModeRef.current !== null && prevSaveConfigModeRef.current !== currentMode) {
      logger.debug('AdPreviewContext', `⚙️ Switched to ${currentMode} save mode`, {
        hasImages,
        imageCount: adContent?.imageVariations?.length || 0,
        debounceMs: saveConfig.debounceMs
      })
    }
    
    prevSaveConfigModeRef.current = currentMode
  }, [adContent?.imageVariations?.length, adContent?.baseImageUrl, saveConfig.debounceMs])
  
  // Auto-save with dynamic config based on whether images are present
  const { isSaving, lastSaved, error } = useAutoSave(
    adPreviewState, 
    saveFn, 
    saveConfig
  )

  // Function to generate image variations from base image
  // NOTE: This function is now a no-op since AI generates all 3 variations upfront
  // Keeping it for backward compatibility
  const generateImageVariations = async (_baseImageUrl: string, _campaignId?: string) => {
    logger.debug('AdPreviewContext', 'generateImageVariations called but AI already generated all 3 variations')
    // All 3 variations are generated by AI in handleImageGeneration
    // This function is kept for backward compatibility but does nothing
    return Promise.resolve();
  }

  // Reset function to clear all ad preview state
  const resetAdPreview = useCallback(() => {
    logger.debug('AdPreviewContext', 'Resetting ad preview state')
    setAdContent(null);
    setIsPublished(false);
    setSelectedCreativeVariation(null);
    setSelectedImageIndex(null);
    prevSaveConfigModeRef.current = null; // Reset mode tracking
  }, []);

  return (
    <AdPreviewContext.Provider value={{ 
      adContent, 
      setAdContent, 
      isPublished, 
      setIsPublished,
      selectedCreativeVariation,
      setSelectedCreativeVariation,
      selectedImageIndex,
      setSelectedImageIndex,
      loadingVariations,
      generateImageVariations,
      resetAdPreview,
      isSaving,
      lastSaved,
      saveError: error
    }}>
      {children}
    </AdPreviewContext.Provider>
  )
}

export function useAdPreview() {
  const context = useContext(AdPreviewContext)
  if (context === undefined) {
    throw new Error("useAdPreview must be used within an AdPreviewProvider")
  }
  return context
}
