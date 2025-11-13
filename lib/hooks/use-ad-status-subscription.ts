/**
 * Feature: Use Ad Status Subscription Hook
 * Purpose: Subscribe to real-time status updates for ads using Supabase Realtime
 * References:
 *  - Supabase Realtime: https://supabase.com/docs/guides/realtime
 */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { AdStatus, AdPublishingMetadata } from '../types/workspace'

// Client-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface UseAdStatusSubscriptionOptions {
  adId: string | null
  onStatusChange?: (newStatus: AdStatus, metadata?: AdPublishingMetadata) => void
  enabled?: boolean
}

interface UseAdStatusSubscriptionReturn {
  currentStatus: AdStatus | null
  metadata: AdPublishingMetadata | null
  isSubscribed: boolean
}

/**
 * Hook to subscribe to ad status changes in real-time
 */
export function useAdStatusSubscription({
  adId,
  onStatusChange,
  enabled = true
}: UseAdStatusSubscriptionOptions): UseAdStatusSubscriptionReturn {
  const [currentStatus, setCurrentStatus] = useState<AdStatus | null>(null)
  const [metadata, setMetadata] = useState<AdPublishingMetadata | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!enabled || !adId) {
      setIsSubscribed(false)
      return
    }

    // Subscribe to ads table changes
    const adsChannel = supabase
      .channel(`ad-${adId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ads',
          filter: `id=eq.${adId}`
        },
        (payload) => {
          const newStatus = payload.new.publishing_status as AdStatus
          setCurrentStatus(newStatus)
          
          if (onStatusChange) {
            onStatusChange(newStatus)
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    // Subscribe to metadata table changes
    const metadataChannel = supabase
      .channel(`ad-metadata-${adId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ad_publishing_metadata',
          filter: `ad_id=eq.${adId}`
        },
        (payload) => {
          const newMetadata = payload.new as unknown as AdPublishingMetadata
          setMetadata(newMetadata)
          
          if (onStatusChange && newMetadata.current_status) {
            onStatusChange(newMetadata.current_status, newMetadata)
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      void supabase.removeChannel(adsChannel)
      void supabase.removeChannel(metadataChannel)
      setIsSubscribed(false)
    }
  }, [adId, enabled, onStatusChange])

  return {
    currentStatus,
    metadata,
    isSubscribed
  }
}

/**
 * Hook to subscribe to multiple ads status changes
 */
export function useMultipleAdsStatusSubscription({
  campaignId,
  onAnyStatusChange,
  enabled = true
}: {
  campaignId: string | null
  onAnyStatusChange?: (adId: string, newStatus: AdStatus) => void
  enabled?: boolean
}) {
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!enabled || !campaignId) {
      setIsSubscribed(false)
      return
    }

    // Subscribe to all ads in campaign
    const channel = supabase
      .channel(`campaign-ads-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ads',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          const adId = payload.new.id as string
          const newStatus = payload.new.publishing_status as AdStatus
          
          if (onAnyStatusChange) {
            onAnyStatusChange(adId, newStatus)
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    // Cleanup
    return () => {
      void supabase.removeChannel(channel)
      setIsSubscribed(false)
    }
  }, [campaignId, enabled, onAnyStatusChange])

  return {
    isSubscribed
  }
}

