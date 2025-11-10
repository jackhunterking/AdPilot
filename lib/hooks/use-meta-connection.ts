"use client"

/**
 * Feature: Meta Connection Status Hook
 * Purpose: Real-time Meta connection and payment status tracking with localStorage auto-detection
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

import { useState, useEffect, useCallback } from 'react'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { metaStorage } from '@/lib/meta/storage'
import type { MetaConnectionStatus, PaymentStatus } from '@/lib/types/meta-integration'

export function useMetaConnection() {
  const { campaign } = useCampaignContext()
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus>('disconnected')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unknown')
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Check localStorage first for immediate status update
  useEffect(() => {
    if (!campaign?.id) return
    if (typeof window === 'undefined') return
    
    try {
      const summary = metaStorage.getConnectionSummary(campaign.id)
      const connection = metaStorage.getConnection(campaign.id)
      
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
          hasAssets
        )
        
        if (isConnected) {
          setMetaStatus('connected')
        }
        
        const hasPayment = Boolean(
          summary?.paymentConnected ||
          connection?.ad_account_payment_connected
        )
        
        if (hasPayment) {
          setPaymentStatus('verified')
        }
      }
    } catch (error) {
      console.error('[useMetaConnection] localStorage check failed:', error)
    }
  }, [campaign?.id])

  const refreshStatus = useCallback(async () => {
    if (!campaign?.id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/meta/connection?campaignId=${campaign.id}`)
      if (res.ok) {
        const data = await res.json()
        setMetaStatus(data.connection.status)
        setPaymentStatus(data.connection.paymentStatus)
        setLastChecked(new Date())
      }
    } catch (err) {
      console.error('Failed to refresh Meta status:', err)
    } finally {
      setLoading(false)
    }
  }, [campaign?.id])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Poll every 30 seconds if connection is pending
  useEffect(() => {
    if (metaStatus === 'pending') {
      const interval = setInterval(refreshStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [metaStatus, refreshStatus])

  return {
    metaStatus,
    paymentStatus,
    loading,
    lastChecked,
    refreshStatus,
    isReady: metaStatus === 'connected' && paymentStatus === 'verified',
  }
}

