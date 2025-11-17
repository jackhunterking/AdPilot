"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useCurrentAd } from "@/lib/context/current-ad-context"
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
}

const AdPreviewContext = createContext<AdPreviewContextType | undefined>(undefined)

export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaignContext()
  const { currentAd } = useCurrentAd()
  const [adContent, setAdContent] = useState<AdContent | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [selectedCreativeVariation, setSelectedCreativeVariation] = useState<CreativeVariation | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loadingVariations] = useState<boolean[]>([false, false, false])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  
  // Track previous save config mode to only log transitions
  const prevSaveConfigModeRef = useRef<'CRITICAL' | 'NORMAL' | null>(null)

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
        logger.debug('AdPreviewContext', `Fetching snapshot for ad ${currentAd.id}`)
        
        const response = await fetch(`/api/campaigns/${campaign?.id}/ads/${currentAd.id}/snapshot`)
        
        if (!response.ok) {
          logger.warn('AdPreviewContext', 'Failed to load snapshot, starting empty')
          setIsInitialized(true)
          return
        }
        
        const json = await response.json()
        const snapshot = json.setup_snapshot
        
        // CRITICAL: Hydrate from backend (single source of truth)
        if (snapshot?.creative?.imageVariations?.length > 0) {
          logger.info('AdPreviewContext', `✅ Loaded ${snapshot.creative.imageVariations.length} creatives from backend`)
          
          // Get copy data for initial display (headline, body, CTA)
          const firstCopy = snapshot.copy?.variations?.[0]
          
          // Hydrate adContent with all 3 variations
          setAdContent({
            imageVariations: snapshot.creative.imageVariations, // ["url1", "url2", "url3"]
            baseImageUrl: snapshot.creative.baseImageUrl,
            imageUrl: snapshot.creative.imageUrl, // Legacy support
            headline: firstCopy?.headline || '',
            body: firstCopy?.primaryText || '',
            cta: firstCopy?.cta || 'Learn More',
          })
          
          // Hydrate selectedImageIndex (which variation user selected)
          const selectedIdx = snapshot.creative.selectedImageIndex
          
          logger.debug('AdPreviewContext', `Hydrating selection index: ${selectedIdx}`)
          
          // Always set the index from snapshot (even if -1 or null)
          setSelectedImageIndex(selectedIdx)
          
          // Set variation object only if valid index
          if (typeof selectedIdx === 'number' && selectedIdx >= 0 && selectedIdx < 3) {
            const variations = [
              { gradient: "from-blue-600 via-blue-500 to-cyan-500", title: "Variation 1" },
              { gradient: "from-purple-600 via-purple-500 to-pink-500", title: "Variation 2" },
              { gradient: "from-green-600 via-green-500 to-emerald-500", title: "Variation 3" },
            ]
            const selectedVariation = variations[selectedIdx]
            if (selectedVariation) {
              setSelectedCreativeVariation(selectedVariation)
              logger.info('AdPreviewContext', `✅ Selected variation ${selectedIdx}`)
            }
          } else {
            // No variation object for invalid index
            setSelectedCreativeVariation(null)
            logger.debug('AdPreviewContext', 'No valid selection index yet')
          }
          
          logger.debug('AdPreviewContext', '✅ State hydrated from backend')
        } else {
          // Truly empty - no creatives generated yet (valid for new ads)
          logger.debug('AdPreviewContext', 'No creatives in backend, starting empty (new ad)')
          setAdContent(null)
          setSelectedImageIndex(null)
          setSelectedCreativeVariation(null)
        }
        
        setIsInitialized(true)
      } catch (err) {
        logger.error('AdPreviewContext', 'Error loading snapshot', err)
        // On error, start empty (don't block user)
        setIsInitialized(true)
      }
    }
    
    loadSnapshot()
  }, [currentAd?.id, campaign?.id])

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
      resetAdPreview
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
