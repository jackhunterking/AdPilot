/**
 * Feature: Campaign Ads Hook
 * Purpose: Fetch and manage ads for a campaign with caching and auto-refresh
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

import { useState, useEffect, useCallback } from "react"
import { logger } from "@/lib/utils/logger"

export interface CampaignAd {
  id: string
  campaign_id: string
  meta_ad_id: string | null
  name: string
  status: "active" | "learning" | "paused" | "draft" | "archived"
  metrics_snapshot: {
    leads?: number
    cpa?: number
    spend?: number
    impressions?: number
    reach?: number
    results?: number
  } | null
  // Snapshot built from normalized tables (ad_creatives, ad_copy_variations, etc.)
  setup_snapshot: {
    creative?: {
      imageUrl?: string
      imageVariations?: string[]
      baseImageUrl?: string
      selectedImageIndex?: number | null
      format?: string
    }
    copy?: {
      headline?: string
      primaryText?: string
      description?: string
      cta?: string
      variations?: unknown[]
      selectedCopyIndex?: number | null
    }
    location?: {
      locations?: unknown[]
    }
    destination?: {
      type?: string
      data?: Record<string, unknown>
    } | null
    budget?: {
      dailyBudget?: number
      currency?: string
      startTime?: string | null
      endTime?: string | null
      timezone?: string | null
    } | null
  } | null
  created_at: string
  updated_at: string
}

interface UseCampaignAdsResult {
  ads: CampaignAd[]
  loading: boolean
  error: string | null
  refreshAds: () => Promise<void>
  updateAdStatus: (adId: string, status: CampaignAd['status']) => void
  createAd: (adData: Partial<CampaignAd>) => Promise<CampaignAd | null>
  updateAd: (adId: string, updates: Partial<CampaignAd>) => Promise<boolean>
  deleteAd: (adId: string) => Promise<{ success: boolean; error?: string; deletedAd?: unknown }>
}

export function useCampaignAds(campaignId: string | undefined): UseCampaignAdsResult {
  const [ads, setAds] = useState<CampaignAd[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAds = useCallback(async () => {
    if (!campaignId) {
      setAds([])
      return
    }

    const traceId = `fetch_ads_${Date.now()}`
    logger.debug('useCampaignAds', `[${traceId}] fetchAds start`, { campaignId })
    
    setLoading(true)
    setError(null)
    
    const startTime = Date.now()
    
    try {
      // Add timestamp-based cache busting
      const cacheBuster = Date.now()
      const res = await fetch(`/api/v1/ads?campaignId=${campaignId}&ts=${cacheBuster}`, {
        cache: "no-store"
      })
      
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(json?.error || `Failed to fetch ads (${res.status})`)
      }

      const response = await res.json()
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response structure from API')
      }
      
      // API wraps response: { success: true, data: { ads: [...] } }
      if (!response.data || !Array.isArray(response.data.ads)) {
        console.warn(`[${traceId}] Response missing ads array, using empty array`, response)
        setAds([])
        return
      }
      
      const duration = Date.now() - startTime
      console.log(`[${traceId}] fetchAds success:`, {
        campaignId,
        adCount: response.data.ads.length,
        duration: `${duration}ms`
      })
      
      setAds(response.data.ads)
      
    } catch (err) {
      const duration = Date.now() - startTime
      console.error(`[${traceId}] fetchAds error after ${duration}ms:`, {
        error: err instanceof Error ? err.message : 'Unknown error',
        campaignId
      })
      setError(err instanceof Error ? err.message : "Failed to fetch ads")
      setAds([])
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  const updateAdStatus = useCallback((adId: string, status: CampaignAd['status']) => {
    logger.debug('useCampaignAds', 'updateAdStatus optimistic update', {
      adId,
      status,
    })
    setAds(prev =>
      prev.map(ad =>
        ad.id === adId
          ? {
              ...ad,
              status,
              updated_at: new Date().toISOString(),
            }
          : ad
      )
    )
  }, [])

  const refreshAds = useCallback(async () => {
    await fetchAds()
  }, [fetchAds])

  const createAd = useCallback(async (adData: Partial<CampaignAd>): Promise<CampaignAd | null> => {
    if (!campaignId) return null

    try {
      const res = await fetch(`/api/v1/ads?campaignId=${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adData)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || "Failed to create ad")
      }

      const response = await res.json()
      const newAd = response.data.ad as CampaignAd
      
      // Add to local state
      setAds(prev => [...prev, newAd])
      
      return newAd
    } catch (err) {
      console.error("[useCampaignAds] createAd error:", err)
      setError(err instanceof Error ? err.message : "Failed to create ad")
      return null
    }
  }, [campaignId])

  const updateAd = useCallback(async (adId: string, updates: Partial<CampaignAd>): Promise<boolean> => {
    if (!campaignId) return false

    try {
      const res = await fetch(`/api/v1/ads/${adId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || "Failed to update ad")
      }

      const response = await res.json()
      const updatedAd = response.data.ad as CampaignAd
      
      // Update local state
      setAds(prev => prev.map(ad => ad.id === adId ? updatedAd : ad))
      
      return true
    } catch (err) {
      console.error("[useCampaignAds] updateAd error:", err)
      setError(err instanceof Error ? err.message : "Failed to update ad")
      return false
    }
  }, [campaignId])

  const deleteAd = useCallback(async (adId: string): Promise<{ success: boolean; error?: string; deletedAd?: unknown }> => {
    if (!campaignId) {
      return { success: false, error: 'No campaign ID provided' }
    }

    const traceId = `delete_ad_${adId.substring(0, 8)}_${Date.now()}`
    
    logger.debug('useCampaignAds', `[${traceId}] Delete operation started`, { campaignId, adId })

    try {
      const res = await fetch(`/api/v1/ads/${adId}`, {
        method: "DELETE"
      })

      // Handle different response statuses
      if (res.status === 404) {
        console.warn(`[${traceId}] Ad not found (already deleted)`)
        // Remove from local state anyway (idempotent)
        setAds(prev => prev.filter(ad => ad.id !== adId))
        return { 
          success: true, 
          error: 'Ad was already deleted'
        }
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Unknown error' }))
        const errorMsg = json?.error || `Failed to delete ad (${res.status})`
        console.error(`[${traceId}] Delete failed:`, errorMsg)
        return { success: false, error: errorMsg }
      }

      const response = await res.json()
      logger.debug('useCampaignAds', `[${traceId}] Delete succeeded`, {
        deletedAd: response.data.deletedAd?.id
      })

      // Remove from local state after confirmed deletion
      setAds(prev => {
        const newAds = prev.filter(ad => ad.id !== adId)
        logger.debug('useCampaignAds', `[${traceId}] Local state updated`, {
          previousCount: prev.length,
          newCount: newAds.length
        })
        return newAds
      })
      
      return { 
        success: true, 
        deletedAd: response.data.deletedAd 
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete ad"
      console.error(`[${traceId}] Delete exception:`, {
        error: errorMsg,
        campaignId,
        adId
      })
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }, [campaignId])

  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  return {
    ads,
    loading,
    error,
    refreshAds,
    updateAdStatus,
    createAd,
    updateAd,
    deleteAd
  }
}

