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
  const hasInitialized = useRef(false)

  // Check localStorage ONCE on mount for immediate status update
  useEffect(() => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    if (hasInitialized.current) return // Prevent re-reading
    
    hasInitialized.current = true
    
    try {
      const summary = metaStorage.getConnectionSummary(campaign.id)
      const connection = metaStorage.getConnection(campaign.id)
      
      console.log('[useMetaConnection] Reading localStorage on mount (ONCE)', {
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
        
        setLastChecked(new Date())
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

  // Manual refresh function for explicit status updates (called by components when needed)
  const refreshStatus = useCallback(() => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    
    console.log('[useMetaConnection] Manual refresh from localStorage', {
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

  return {
    metaStatus,
    paymentStatus,
    loading,
    lastChecked,
    refreshStatus,
    isReady: metaStatus === 'connected' && paymentStatus === 'verified',
  }
}

