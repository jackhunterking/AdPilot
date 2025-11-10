"use client"

/**
 * Feature: Meta Connection Status Hook
 * Purpose: Real-time Meta connection and payment status tracking with localStorage auto-detection
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { metaStorage } from '@/lib/meta/storage'
import { META_EVENTS, type MetaConnectionChangeEvent, type MetaPaymentUpdateEvent, type MetaDisconnectionEvent } from '@/lib/utils/meta-events'
import type { MetaConnectionStatus, PaymentStatus } from '@/lib/types/meta-integration'

export function useMetaConnection() {
  const { campaign } = useCampaignContext()
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus>('disconnected')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unknown')
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const refreshDebounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Check localStorage first for immediate status update
  useEffect(() => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    
    try {
      const summary = metaStorage.getConnectionSummary(campaign.id)
      const connection = metaStorage.getConnection(campaign.id)
      
      console.log('[useMetaConnection] Reading localStorage on mount', {
        campaignId: campaign.id,
        hasSummary: !!summary,
        hasConnection: !!connection,
        summaryStatus: summary?.status,
        paymentConnected: summary?.paymentConnected,
      })
      
      if (summary || connection) {
        // Auto-detect from localStorage
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
        
        // Set connection status explicitly
        if (isConnected) {
          setMetaStatus('connected')
          console.log('[useMetaConnection] Set metaStatus to: connected')
        } else {
          setMetaStatus('disconnected')
          console.log('[useMetaConnection] Set metaStatus to: disconnected')
        }
        
        // Set payment status explicitly based on connection state
        if (isConnected) {
          if (hasPayment) {
            setPaymentStatus('verified')
            console.log('[useMetaConnection] Set paymentStatus to: verified')
          } else {
            setPaymentStatus('missing')
            console.log('[useMetaConnection] Set paymentStatus to: missing (connected but no payment)')
          }
        } else {
          setPaymentStatus('unknown')
          console.log('[useMetaConnection] Set paymentStatus to: unknown (no connection)')
        }
      } else {
        // No connection data at all
        setMetaStatus('disconnected')
        setPaymentStatus('unknown')
        console.log('[useMetaConnection] No connection data found, set to disconnected/unknown')
      }
    } catch (error) {
      console.error('[useMetaConnection] localStorage check failed:', error)
    }
  }, [campaign?.id])

  const refreshStatus = useCallback(() => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    
    console.log('[useMetaConnection] Refreshing from localStorage', {
      campaignId: campaign.id,
    })
    
    try {
      const summary = metaStorage.getConnectionSummary(campaign.id)
      const connection = metaStorage.getConnection(campaign.id)
      
      console.log('[useMetaConnection] Read from localStorage', {
        hasSummary: !!summary,
        hasConnection: !!connection,
        summaryStatus: summary?.status,
        hasAdAccount: !!summary?.adAccount?.id,
        paymentConnected: summary?.paymentConnected,
      })
      
      // Same logic as initial mount - SINGLE SOURCE OF TRUTH
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
      
      // Set statuses explicitly
      if (isConnected) {
        setMetaStatus('connected')
        setPaymentStatus(hasPayment ? 'verified' : 'missing')
        console.log('[useMetaConnection] Set to connected', {
          paymentStatus: hasPayment ? 'verified' : 'missing',
        })
      } else {
        setMetaStatus('disconnected')
        setPaymentStatus('unknown')
        console.log('[useMetaConnection] Set to disconnected')
      }
      
      setLastChecked(new Date())
      
      console.log('[useMetaConnection] Refreshed from localStorage - FINAL STATE', {
        metaStatus: isConnected ? 'connected' : 'disconnected',
        paymentStatus: isConnected ? (hasPayment ? 'verified' : 'missing') : 'unknown',
      })
    } catch (error) {
      console.error('[useMetaConnection] Refresh failed:', error)
    }
  }, [campaign?.id])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Debounced refresh to prevent excessive calls
  const debouncedRefresh = useCallback(() => {
    // Clear any pending refresh
    if (refreshDebounceTimer.current) {
      clearTimeout(refreshDebounceTimer.current)
    }

    // Schedule new refresh (300ms debounce)
    refreshDebounceTimer.current = setTimeout(() => {
      refreshStatus()
    }, 300)
  }, [refreshStatus])

  // Listen for Meta connection events
  useEffect(() => {
    if (typeof window === 'undefined' || !campaign?.id) return

    const handleConnectionChange = (event: Event) => {
      try {
        const customEvent = event as MetaConnectionChangeEvent
        const { campaignId, status } = customEvent.detail

        // Only respond to events for THIS campaign
        if (campaignId !== campaign.id) {
          console.log('[useMetaConnection] Ignoring event for different campaign', {
            eventCampaignId: campaignId,
            currentCampaignId: campaign.id,
          })
          return
        }

        console.log('[useMetaConnection] Connection changed event received', {
          campaignId,
          status,
        })

        // Update status immediately from event
        if (status === 'connected') {
          setMetaStatus('connected')
        } else if (status === 'disconnected') {
          setMetaStatus('disconnected')
          setPaymentStatus('unknown')
        }

        // Refresh from localStorage with debounce
        debouncedRefresh()
      } catch (error) {
        console.error('[useMetaConnection] Error handling connection change event:', error)
      }
    }

    const handleDisconnection = (event: Event) => {
      try {
        const customEvent = event as MetaDisconnectionEvent
        const { campaignId } = customEvent.detail

        // Only respond to events for THIS campaign
        if (campaignId !== campaign.id) {
          return
        }

        console.log('[useMetaConnection] Disconnection event received', { campaignId })

        // Update status immediately
        setMetaStatus('disconnected')
        setPaymentStatus('unknown')

        // Refresh from localStorage with debounce
        debouncedRefresh()
      } catch (error) {
        console.error('[useMetaConnection] Error handling disconnection event:', error)
      }
    }

    const handlePaymentUpdate = (event: Event) => {
      try {
        const customEvent = event as MetaPaymentUpdateEvent
        const { campaignId, paymentStatus: newPaymentStatus } = customEvent.detail

        // Only respond to events for THIS campaign
        if (campaignId !== campaign.id) {
          return
        }

        console.log('[useMetaConnection] Payment update event received', {
          campaignId,
          paymentStatus: newPaymentStatus,
        })

        // Update payment status immediately from event
        setPaymentStatus(newPaymentStatus)

        // Refresh from localStorage with debounce
        debouncedRefresh()
      } catch (error) {
        console.error('[useMetaConnection] Error handling payment update event:', error)
      }
    }

    // Add event listeners
    window.addEventListener(META_EVENTS.CONNECTION_CHANGED, handleConnectionChange)
    window.addEventListener(META_EVENTS.DISCONNECTION, handleDisconnection)
    window.addEventListener(META_EVENTS.PAYMENT_UPDATED, handlePaymentUpdate)

    console.log('[useMetaConnection] Event listeners registered for campaign:', campaign.id)

    // Cleanup
    return () => {
      window.removeEventListener(META_EVENTS.CONNECTION_CHANGED, handleConnectionChange)
      window.removeEventListener(META_EVENTS.DISCONNECTION, handleDisconnection)
      window.removeEventListener(META_EVENTS.PAYMENT_UPDATED, handlePaymentUpdate)
      
      // Clear debounce timer
      if (refreshDebounceTimer.current) {
        clearTimeout(refreshDebounceTimer.current)
      }

      console.log('[useMetaConnection] Event listeners cleaned up for campaign:', campaign.id)
    }
  }, [campaign?.id, debouncedRefresh])

  // Listen for storage events (multi-tab sync)
  useEffect(() => {
    if (typeof window === 'undefined' || !campaign?.id) return

    const handleStorageChange = (event: StorageEvent) => {
      try {
        // Only respond to Meta connection changes
        if (!event.key || !event.key.startsWith('meta_connection_')) {
          return
        }

        // Check if this is for our campaign
        const storedCampaignId = event.key.replace('meta_connection_', '')
        if (storedCampaignId !== campaign.id) {
          return
        }

        console.log('[useMetaConnection] Storage changed in another tab', {
          key: event.key,
          campaignId: storedCampaignId,
        })

        // Refresh status with debounce
        debouncedRefresh()
      } catch (error) {
        console.error('[useMetaConnection] Error handling storage event:', error)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [campaign?.id, debouncedRefresh])

  return {
    metaStatus,
    paymentStatus,
    loading,
    lastChecked,
    refreshStatus,
    isReady: metaStatus === 'connected' && paymentStatus === 'verified',
  }
}

