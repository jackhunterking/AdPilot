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
  saveAdChanges: (payload: {
    copy: unknown
    destination: unknown
    format?: string
  }) => Promise<void>
}

const AdPreviewContext = createContext<AdPreviewContextType | undefined>(undefined)

export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaignContext()
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

  // Load initial state from normalized tables via snapshot API
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
    
    // Fetch ad snapshot from normalized tables
    const loadSnapshot = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaign?.id}/ads/${currentAd.id}/snapshot`)
        if (!response.ok) {
          logger.warn('AdPreviewContext', 'Failed to load snapshot, using empty state')
          setIsInitialized(true)
          return
        }
        
        // Load from normalized ad_creatives table instead of setup_snapshot
        // Note: setup_snapshot.creative column was removed - data is now in ad_creatives table
        // For now, start with empty state - creatives will be loaded/generated via chat
        // use-draft-auto-save hook handles saving to ad_creatives table
        
        logger.debug('AdPreviewContext', 'Starting with empty state (normalized schema)')
        
        setIsInitialized(true)
      } catch (err) {
        logger.error('AdPreviewContext', 'Error loading snapshot', err)
        setIsInitialized(true)
      }
    }
    
    loadSnapshot()
  }, [currentAd?.id, campaign?.id])

  // Save function - DEPRECATED: Auto-save hook handles persistence
  // This context manages UI state only, actual database saves handled by use-draft-auto-save
  const saveFn = useCallback(async (state: typeof adPreviewState) => {
    if (!isInitialized) return
    
    // No-op: Saving is handled by use-draft-auto-save hook which uses /save endpoint
    // This prevents the context from trying to save to deprecated setup_snapshot column
    logger.debug('AdPreviewContext', 'State updated (auto-save hook handles persistence)', {
      hasImageVariations: !!state.adContent?.imageVariations?.length,
      imageCount: state.adContent?.imageVariations?.length || 0
    })
  }, [isInitialized])

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

  // Manual save function for "Save Changes" button
  const saveAdChanges = useCallback(async (payload: {
    copy: unknown
    destination: unknown
    format?: string
  }) => {
    if (!currentAd || !campaign?.id) {
      throw new Error('No ad or campaign selected')
    }

    logger.debug('AdPreviewContext', 'Saving ad changes', {
      adId: currentAd.id,
      campaignId: campaign.id
    })

    // Build the complete save payload
    const savePayload = {
      copy: payload.copy,
      creative: {
        imageVariations: adContent?.imageVariations || [],
        selectedImageIndex: selectedImageIndex ?? 0,
        selectedCreativeVariation: selectedCreativeVariation || {
          gradient: 'from-blue-600 via-blue-500 to-cyan-500',
          title: 'Variation 1'
        },
        baseImageUrl: adContent?.baseImageUrl,
        format: payload.format || 'feed'
      },
      destination: payload.destination,
      metadata: {
        editContext: 'manual_save',
        savedFrom: 'edit_mode'
      }
    }

    // Call the save API
    const response = await fetch(
      `/api/campaigns/${campaign.id}/ads/${currentAd.id}/save`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload)
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to save ad changes')
    }

    const result = await response.json()
    logger.debug('AdPreviewContext', 'Ad changes saved successfully', {
      adId: result.ad?.id
    })

    return result
  }, [currentAd, campaign?.id, adContent, selectedImageIndex, selectedCreativeVariation]);

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
      saveError: error,
      saveAdChanges
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
