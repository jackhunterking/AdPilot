"use client"

/**
 * Feature: Meta Connection Status Hook
 * Purpose: Real-time Meta connection and payment status tracking from database
 * References:
 *  - Supabase Realtime: https://supabase.com/docs/guides/realtime/postgres-changes
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 * 
 * REFACTORED: Migrated from localStorage (metaStorage) to database-first approach
 * - Reads from campaign_meta_connections + meta_tokens tables
 * - Real-time updates via Supabase subscriptions
 * - Backward compatible with localStorage fallback during transition
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { getCampaignMetaConnection } from '@/lib/services/meta-connection-manager'
import { metaStorage } from '@/lib/meta/storage' // LEGACY: Fallback only during migration
import { META_EVENTS, type MetaConnectionChangeEvent, type MetaPaymentUpdateEvent, type MetaDisconnectionEvent, type MetaConnectionUpdatedEvent } from '@/lib/utils/meta-events'
import type { MetaConnectionStatus, PaymentStatus } from '@/lib/types/meta-integration'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'

export function useMetaConnection() {
  const { campaign } = useCampaignContext()
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus>('disconnected')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unknown')
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const hasInitialized = useRef(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFetchingRef = useRef(false)

  // Load connection status from database on mount
  useEffect(() => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    if (hasInitialized.current) return // Prevent re-reading
    
    hasInitialized.current = true
    
    const loadFromDatabase = async () => {
      if (isFetchingRef.current) return
      
      try {
        isFetchingRef.current = true
        setLoading(true)
        logger.debug('useMetaConnection', '🔍 Loading connection from database (PRIMARY)', {
          campaignId: campaign.id,
        })
        
        // PRIMARY: Try database first
        const dbConnection = await getCampaignMetaConnection(campaign.id)
        
        if (dbConnection) {
          logger.debug('useMetaConnection', '✅ Found connection in database', {
            campaignId: campaign.id,
            hasBusiness: !!dbConnection.business?.id,
            hasAdAccount: !!dbConnection.adAccount?.id,
            hasToken: !!dbConnection.tokens.long_lived_user_token,
            connectionStatus: dbConnection.connection_status,
            paymentConnected: dbConnection.payment_connected,
          })
          
          // Set status from database
          const isConnected = dbConnection.connection_status === 'connected' && 
            (!!dbConnection.business?.id || !!dbConnection.adAccount?.id)
          
          setMetaStatus(isConnected ? 'connected' : 'disconnected')
          setPaymentStatus(
            isConnected 
              ? (dbConnection.payment_connected ? 'verified' : 'missing')
              : 'unknown'
          )
          setLastChecked(new Date())
          setLoading(false)
          return
        }
        
        // FALLBACK: Try localStorage (during migration period)
        logger.debug('useMetaConnection', '⚠️ No database connection, checking localStorage (FALLBACK)', {
          campaignId: campaign.id,
        })
        
        const summary = metaStorage.getConnectionSummary(campaign.id)
        const connection = metaStorage.getConnection(campaign.id)
        
        if (summary || connection) {
          logger.debug('useMetaConnection', '📦 Found connection in localStorage (LEGACY)', {
            campaignId: campaign.id,
            hasSummary: !!summary,
            hasConnection: !!connection,
            summaryStatus: summary?.status,
            paymentConnected: summary?.paymentConnected,
          })
          
          // Auto-detect from localStorage (legacy)
          const hasAssets = Boolean(
            summary?.adAccount?.id || 
            connection?.selected_ad_account_id ||
            summary?.business?.id ||
            connection?.selected_business_id
          )
          
          const isConnected = Boolean(
            summary?.status === 'connected' ||
            summary?.status === 'selected_assets' ||
            summary?.status === 'payment_linked' ||
            hasAssets
          )
          
          const hasPayment = Boolean(
            summary?.paymentConnected ||
            connection?.ad_account_payment_connected
          )
          
          setMetaStatus(isConnected ? 'connected' : 'disconnected')
          setPaymentStatus(
            isConnected 
              ? (hasPayment ? 'verified' : 'missing')
              : 'unknown'
          )
          setLastChecked(new Date())
        } else {
          // No connection data anywhere
          logger.debug('useMetaConnection', 'ℹ️ No connection data found (database or localStorage)', {
            campaignId: campaign.id,
          })
          setMetaStatus('disconnected')
          setPaymentStatus('unknown')
        }
        
        setLoading(false)
      } catch (error) {
        logger.error('useMetaConnection', 'Failed to load connection status', error)
        setMetaStatus('disconnected')
        setPaymentStatus('unknown')
        setLoading(false)
      } finally {
        isFetchingRef.current = false
      }
    }
    
    loadFromDatabase()
  }, [campaign?.id])

  // Manual refresh function for explicit status updates (called by components when needed)
  const refreshStatus = useCallback(async () => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    if (isFetchingRef.current) return
    
    try {
      isFetchingRef.current = true
      setLoading(true)
      logger.debug('useMetaConnection', '🔄 Manual refresh from database (PRIMARY)', {
        campaignId: campaign.id,
      })
      
      // PRIMARY: Try database first
      const dbConnection = await getCampaignMetaConnection(campaign.id)
      
      if (dbConnection) {
        logger.debug('useMetaConnection', '✅ Refreshed from database', {
          campaignId: campaign.id,
          hasBusiness: !!dbConnection.business?.id,
          hasAdAccount: !!dbConnection.adAccount?.id,
          connectionStatus: dbConnection.connection_status,
          paymentConnected: dbConnection.payment_connected,
        })
        
        const isConnected = dbConnection.connection_status === 'connected' && 
          (!!dbConnection.business?.id || !!dbConnection.adAccount?.id)
        
        setMetaStatus(isConnected ? 'connected' : 'disconnected')
        setPaymentStatus(
          isConnected 
            ? (dbConnection.payment_connected ? 'verified' : 'missing')
            : 'unknown'
        )
        setLastChecked(new Date())
        setLoading(false)
        return
      }
      
      // FALLBACK: Try localStorage (during migration)
      logger.debug('useMetaConnection', '⚠️ No database connection, checking localStorage (FALLBACK)')
      
      const summary = metaStorage.getConnectionSummary(campaign.id)
      const connection = metaStorage.getConnection(campaign.id)
      
      if (summary || connection) {
        logger.debug('useMetaConnection', '📦 Read from localStorage (LEGACY)', {
          hasSummary: !!summary,
          hasConnection: !!connection,
          summaryStatus: summary?.status,
          hasAdAccount: !!summary?.adAccount?.id,
          paymentConnected: summary?.paymentConnected,
        })
        
        const hasAssets = Boolean(
          summary?.adAccount?.id || 
          connection?.selected_ad_account_id ||
          summary?.business?.id ||
          connection?.selected_business_id
        )
        
        const isConnected = Boolean(
          summary?.status === 'connected' ||
          summary?.status === 'selected_assets' ||
          summary?.status === 'payment_linked' ||
          hasAssets
        )
        
        const hasPayment = Boolean(
          summary?.paymentConnected ||
          connection?.ad_account_payment_connected
        )
        
        setMetaStatus(isConnected ? 'connected' : 'disconnected')
        setPaymentStatus(isConnected ? (hasPayment ? 'verified' : 'missing') : 'unknown')
      } else {
        setMetaStatus('disconnected')
        setPaymentStatus('unknown')
      }
      
      setLastChecked(new Date())
      setLoading(false)
      
      logger.debug('useMetaConnection', 'Refresh complete - FINAL STATE', {
        metaStatus,
        paymentStatus,
      })
    } catch (error) {
      logger.error('useMetaConnection', 'Refresh failed', error)
      setLoading(false)
    } finally {
      isFetchingRef.current = false
    }
  }, [campaign?.id])

  // Debounced refresh function to prevent rapid-fire calls
  const debouncedRefreshStatus = useCallback((delay = 300) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      void refreshStatus()
    }, delay)
  }, [refreshStatus])

  // Listen for connection updated events (backward compatibility with localStorage events)
  useEffect(() => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    
    const handleConnectionUpdated = (event: Event) => {
      const customEvent = event as MetaConnectionUpdatedEvent
      const eventCampaignId = customEvent.detail?.campaignId
      
      // Only refresh if this event is for our campaign
      if (eventCampaignId && eventCampaignId === campaign.id) {
        logger.debug('useMetaConnection', 'Received CONNECTION_UPDATED event (LEGACY)', {
          campaignId: campaign.id,
          eventTimestamp: customEvent.detail?.timestamp,
        })
        
        // Refresh status (will check database first, then localStorage)
        void refreshStatus()
      }
    }
    
    window.addEventListener(META_EVENTS.CONNECTION_UPDATED, handleConnectionUpdated)
    
    logger.debug('useMetaConnection', 'Event listener added for CONNECTION_UPDATED', {
      campaignId: campaign.id,
    })
    
    return () => {
      window.removeEventListener(META_EVENTS.CONNECTION_UPDATED, handleConnectionUpdated)
    }
  }, [campaign?.id, refreshStatus])

  // Real-time database subscription for campaign_meta_connections changes
  useEffect(() => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    
    logger.debug('useMetaConnection', '🔔 Setting up real-time database subscription', {
      campaignId: campaign.id,
    })
    
    // Subscribe to changes in campaign_meta_connections table
    const subscription = supabase
      .channel(`meta_connection_${campaign.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // All events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'campaign_meta_connections',
          filter: `campaign_id=eq.${campaign.id}`,
        },
        (payload) => {
          logger.debug('useMetaConnection', '🔔 Database change detected', {
            campaignId: campaign.id,
            event: payload.eventType,
            hasNewData: !!payload.new,
          })
          
          // Use debounced refresh to prevent rapid-fire calls
          debouncedRefreshStatus(300)
        }
      )
      .subscribe()
    
    logger.debug('useMetaConnection', '✅ Real-time subscription active', {
      campaignId: campaign.id,
    })
    
    return () => {
      logger.debug('useMetaConnection', '🔕 Unsubscribing from real-time updates', {
        campaignId: campaign.id,
      })
      void supabase.removeChannel(subscription)
    }
  }, [campaign?.id, debouncedRefreshStatus])

  return {
    metaStatus,
    paymentStatus,
    loading,
    lastChecked,
    refreshStatus,
    isReady: metaStatus === 'connected' && paymentStatus === 'verified',
  }
}

