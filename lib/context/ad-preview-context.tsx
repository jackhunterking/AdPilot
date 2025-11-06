"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"

interface AdContent {
  imageUrl?: string // Legacy single image support
  imageVariations?: string[] // Array of 6 variation URLs
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
  isSaving: boolean
  lastSaved: Date | null
  saveError: Error | null
}

const AdPreviewContext = createContext<AdPreviewContextType | undefined>(undefined)

export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaignContext()
  const [adContent, setAdContent] = useState<AdContent | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [selectedCreativeVariation, setSelectedCreativeVariation] = useState<CreativeVariation | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loadingVariations] = useState<boolean[]>([false, false, false, false, false, false])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  // CRITICAL: Memoize state to prevent unnecessary recreations
  const adPreviewState = useMemo(() => ({ 
    adContent, 
    isPublished, 
    selectedCreativeVariation,
    selectedImageIndex,
  }), [adContent, isPublished, selectedCreativeVariation, selectedImageIndex])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    console.log(`[AdPreviewContext] Attempting to restore state for campaign ${campaign.id}`);
    console.log(`[AdPreviewContext] campaign_states available:`, !!campaign.campaign_states);
    console.log(`[AdPreviewContext] campaign_states is object:`, typeof campaign.campaign_states === 'object');
    
    // campaign_states is 1-to-1 object, not array
    const savedData = campaign.campaign_states?.ad_preview_data as unknown as {
      adContent?: AdContent | null;
      isPublished?: boolean;
      selectedCreativeVariation?: CreativeVariation | null;
      selectedImageIndex?: number | null;
    } | null
    
    console.log(`[AdPreviewContext] Saved ad_preview_data:`, savedData ? {
      hasAdContent: !!savedData.adContent,
      adContentKeys: savedData.adContent ? Object.keys(savedData.adContent) : [],
      imageVariationsCount: savedData.adContent?.imageVariations?.length || 0
    } : 'null');
    
    if (savedData) {
      if (savedData.adContent) {
        console.log(`[AdPreviewContext] ✅ Restoring adContent with ${savedData.adContent.imageVariations?.length || 0} image variations`);
        setAdContent(savedData.adContent);
      }
      if (savedData.isPublished !== undefined) setIsPublished(savedData.isPublished)
      if (savedData.selectedCreativeVariation) setSelectedCreativeVariation(savedData.selectedCreativeVariation)
      if (savedData.selectedImageIndex !== undefined) setSelectedImageIndex(savedData.selectedImageIndex ?? null)
    } else {
      console.warn(`[AdPreviewContext] ⚠️ No saved ad_preview_data found!`);
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function with proper return type
  const saveFn = useCallback(async (state: typeof adPreviewState) => {
    if (!campaign?.id || !isInitialized) return
    console.log(`[AdPreviewContext] 💾 Saving ad_preview_data:`, {
      hasImageVariations: !!state.adContent?.imageVariations?.length,
      imageCount: state.adContent?.imageVariations?.length || 0,
      hasBaseImage: !!state.adContent?.baseImageUrl,
    })
    await saveCampaignState('ad_preview_data', state)
  }, [campaign?.id, saveCampaignState, isInitialized])

  // Memoize save config to force CRITICAL mode when images present
  // This ensures images save immediately (0ms) instead of 300ms debounce
  const saveConfig = useMemo(() => {
    const hasImages = !!(adContent?.imageVariations?.length || adContent?.baseImageUrl)
    const config = hasImages ? AUTO_SAVE_CONFIGS.CRITICAL : AUTO_SAVE_CONFIGS.NORMAL
    console.log(`[AdPreviewContext] Save config:`, {
      hasImages,
      configType: hasImages ? 'CRITICAL (immediate)' : 'NORMAL (300ms debounce)',
      imageCount: adContent?.imageVariations?.length || 0
    })
    return config
  }, [adContent?.imageVariations?.length, adContent?.baseImageUrl])
  
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
    console.log('⚠️ generateImageVariations called but AI already generated all 3 variations');
    // All 3 variations are generated by AI in handleImageGeneration
    // This function is kept for backward compatibility but does nothing
    return Promise.resolve();
  }

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
