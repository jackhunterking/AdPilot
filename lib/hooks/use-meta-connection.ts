"use client"

/**
 * Feature: Meta Connection Status Hook
 * Purpose: Real-time Meta connection and payment status tracking
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

import { useState, useEffect, useCallback } from 'react'
import { useCampaignContext } from '@/lib/context/campaign-context'
import type { MetaConnectionStatus, PaymentStatus } from '@/lib/types/meta-integration'

export function useMetaConnection() {
  const { campaign } = useCampaignContext()
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus>('disconnected')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unknown')
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

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

