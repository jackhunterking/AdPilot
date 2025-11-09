/**
 * Feature: Campaign Ads Hook
 * Purpose: Fetch and manage ads for a campaign with caching and auto-refresh
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

import { useState, useEffect, useCallback } from "react"

export interface CampaignAd {
  id: string
  campaign_id: string
  meta_ad_id: string | null
  name: string
  status: "active" | "learning" | "paused" | "draft"
  creative_data: Record<string, unknown> | null
  copy_data: Record<string, unknown> | null
  metrics_snapshot: {
    leads?: number
    cpa?: number
    spend?: number
    impressions?: number
    reach?: number
    results?: number
  } | null
  created_at: string
  updated_at: string
}

interface UseCampaignAdsResult {
  ads: CampaignAd[]
  loading: boolean
  error: string | null
  refreshAds: () => Promise<void>
  createAd: (adData: Partial<CampaignAd>) => Promise<CampaignAd | null>
  updateAd: (adId: string, updates: Partial<CampaignAd>) => Promise<boolean>
  deleteAd: (adId: string) => Promise<boolean>
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

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/ads`, {
        cache: "no-store"
      })
      
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || "Failed to fetch ads")
      }

      const data = await res.json()
      setAds(data.ads || [])
    } catch (err) {
      console.error("[useCampaignAds] fetchAds error:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch ads")
      setAds([])
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  const refreshAds = useCallback(async () => {
    await fetchAds()
  }, [fetchAds])

  const createAd = useCallback(async (adData: Partial<CampaignAd>): Promise<CampaignAd | null> => {
    if (!campaignId) return null

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adData)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || "Failed to create ad")
      }

      const data = await res.json()
      const newAd = data.ad as CampaignAd
      
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
      const res = await fetch(`/api/campaigns/${campaignId}/ads/${adId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || "Failed to update ad")
      }

      const data = await res.json()
      const updatedAd = data.ad as CampaignAd
      
      // Update local state
      setAds(prev => prev.map(ad => ad.id === adId ? updatedAd : ad))
      
      return true
    } catch (err) {
      console.error("[useCampaignAds] updateAd error:", err)
      setError(err instanceof Error ? err.message : "Failed to update ad")
      return false
    }
  }, [campaignId])

  const deleteAd = useCallback(async (adId: string): Promise<boolean> => {
    if (!campaignId) return false

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/ads/${adId}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || "Failed to delete ad")
      }

      // Remove from local state
      setAds(prev => prev.filter(ad => ad.id !== adId))
      
      return true
    } catch (err) {
      console.error("[useCampaignAds] deleteAd error:", err)
      setError(err instanceof Error ? err.message : "Failed to delete ad")
      return false
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
    createAd,
    updateAd,
    deleteAd
  }
}

