/**
 * Feature: Meta Connection Actions Hook
 * Purpose: Centralized Meta connect/disconnect/payment actions for reuse across components
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Vercel AI SDK Core: https://ai-sdk.dev/docs/introduction
 */

"use client"

import { useCallback, useState } from 'react'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { metaStorage } from '@/lib/meta/storage'
import { metaLogger } from '@/lib/meta/logger'
import { buildBusinessLoginUrl, generateRandomState } from '@/lib/meta/login'
import { getAdAccountBillingUrl } from '@/lib/meta/payment-urls'
import { emitMetaPaymentUpdate } from '@/lib/utils/meta-events'
import type { SelectionSummaryDTO } from '@/lib/meta/types'

export type PaymentActionStatus = 'idle' | 'opening' | 'processing' | 'error' | 'success'

export function useMetaActions() {
  const { campaign } = useCampaignContext()
  const [paymentStatus, setPaymentStatus] = useState<PaymentActionStatus>('idle')
  const [isConnecting, setIsConnecting] = useState(false)

  /**
   * Get current connection summary from localStorage
   */
  const getSummary = useCallback((): SelectionSummaryDTO | null => {
    if (!campaign?.id) return null
    return metaStorage.getConnectionSummary(campaign.id)
  }, [campaign?.id])

  /**
   * Initiate Meta OAuth connection flow
   */
  const connect = useCallback(() => {
    if (!campaign?.id) {
      window.alert('Missing campaign ID')
      return
    }

    const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_SYSTEM || process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID
    if (!configId) {
      window.alert('Missing Facebook config ID')
      return
    }

    const redirectUri = `${window.location.origin}/api/meta/auth/callback?type=system`
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID
    const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    
    if (!appId) {
      window.alert('Missing Facebook App ID')
      return
    }

    // Set connecting state immediately for UI feedback
    setIsConnecting(true)
    
    // Wait for Facebook SDK to be ready (with timeout)
    const openPopupWhenReady = () => {
      const state = generateRandomState(32)
      
      try {
        sessionStorage.setItem('meta_oauth_state', state)
      } catch {
        // Ignore storage errors
      }

      const url = buildBusinessLoginUrl({
        appId,
        configId,
        redirectUri,
        graphVersion,
        state,
      })

      metaLogger.info('useMetaActions', 'Initiating Meta connection', {
        campaignId: campaign.id,
        configId,
        graphVersion,
        hasFBSDK: typeof window !== 'undefined' && typeof (window as any).FB !== 'undefined',
      })

      // Set cookie for callback
      const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
      document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`

      // Open popup with optimized specs for faster rendering
      let popup: Window | null = null
      try {
        // Optimized popup parameters for faster load
        popup = window.open(
          url, 
          'fb_biz_login', 
          'width=720,height=760,left=' + ((screen.width - 720) / 2) + ',top=' + ((screen.height - 760) / 2) + ',popup=yes,noopener,noreferrer'
        )
      } catch (e) {
        metaLogger.error('useMetaActions', 'Failed to open popup', e as Error)
      }

      // Handle popup blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        const userWantsRedirect = window.confirm(
          'Pop-up was blocked by your browser!\n\n' +
          'To connect your Meta account:\n' +
          '1. Click "OK" to open in a new tab\n' +
          '2. Or enable pop-ups for this site and try again\n\n' +
          'Open in new tab?'
        )

        if (userWantsRedirect) {
          const newTab = window.open(url, '_blank')
          if (!newTab) {
            metaLogger.error('useMetaActions', 'New tab also blocked, navigating current page', new Error('Popup blocked'))
            window.location.href = url
          }
        }
        setIsConnecting(false)
      } else {
        metaLogger.info('useMetaActions', 'Popup opened successfully')
        // Keep connecting state for 1 second to show feedback
        setTimeout(() => setIsConnecting(false), 1000)
      }
    }

    // Check if Facebook SDK is ready
    if (typeof window !== 'undefined' && typeof (window as any).FB !== 'undefined') {
      // SDK ready, open immediately
      metaLogger.info('useMetaActions', 'Facebook SDK ready, opening popup immediately')
      openPopupWhenReady()
    } else {
      // SDK not ready yet, wait up to 2 seconds
      metaLogger.info('useMetaActions', 'Waiting for Facebook SDK...')
      let attempts = 0
      const maxAttempts = 20 // 2 seconds total (100ms * 20)
      
      const checkSDK = setInterval(() => {
        attempts++
        if (typeof window !== 'undefined' && typeof (window as any).FB !== 'undefined') {
          metaLogger.info('useMetaActions', 'Facebook SDK loaded after ' + (attempts * 100) + 'ms')
          clearInterval(checkSDK)
          openPopupWhenReady()
        } else if (attempts >= maxAttempts) {
          metaLogger.warn('useMetaActions', 'Facebook SDK not loaded after 2s, opening anyway')
          clearInterval(checkSDK)
          openPopupWhenReady()
        }
      }, 100)
    }
  }, [campaign?.id])

  /**
   * Meta disconnection is disabled to maintain campaign integrity
   * Once Meta is connected, it cannot be disconnected as it would break campaign logic
   */

  /**
   * Open Facebook billing page to add payment method
   */
  const addPayment = useCallback((adAccountId: string) => {
    if (!adAccountId) {
      metaLogger.error('useMetaActions', 'Cannot add payment - no ad account ID', new Error('Missing ad account ID'))
      return
    }

    metaLogger.info('useMetaActions', 'Opening Facebook billing page', {
      adAccountId,
    })

    setPaymentStatus('opening')

    // Open Facebook billing page in new tab
    const billingUrl = getAdAccountBillingUrl(adAccountId)
    window.open(billingUrl, '_blank', 'noopener,noreferrer')

    // Set status to processing (waiting for user to add payment)
    setPaymentStatus('processing')

    metaLogger.info('useMetaActions', 'Billing page opened, waiting for user to return', {
      billingUrl,
    })
  }, [])

  /**
   * Verify payment status
   */
  const verifyPayment = useCallback(async (adAccountId: string) => {
    if (!campaign?.id || !adAccountId) return false

    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

    try {
      metaLogger.info('useMetaActions', 'Verifying payment status', {
        campaignId: campaign.id,
        adAccountId: actId,
      })

      const verify = await fetch(
        `/api/meta/payment/status?campaignId=${encodeURIComponent(campaign.id)}&adAccountId=${encodeURIComponent(actId)}`,
        { cache: 'no-store' }
      )

      if (verify.ok) {
        const json = await verify.json() as { connected?: boolean }
        metaLogger.info('useMetaActions', 'Payment verification response', json)

        if (json?.connected) {
          metaLogger.info('useMetaActions', 'Payment verified as connected')
          setPaymentStatus('success')

          // Update localStorage
          metaStorage.markPaymentConnected(campaign.id)
          
          // Emit payment verified event AFTER localStorage is updated
          emitMetaPaymentUpdate(campaign.id, 'verified')
          
          return true
        } else {
          metaLogger.info('useMetaActions', 'Payment not yet connected')
          setPaymentStatus('idle')
          
          // Emit missing payment event
          emitMetaPaymentUpdate(campaign.id, 'missing')
          
          return false
        }
      } else {
        metaLogger.error('useMetaActions', 'Payment verification failed', new Error(`Status: ${verify.status}`))
        setPaymentStatus('idle')
        
        // Emit missing payment event on failure
        emitMetaPaymentUpdate(campaign.id, 'missing')
        
        return false
      }
    } catch (verifyError) {
      metaLogger.error('useMetaActions', 'Payment verification exception', verifyError as Error)
      setPaymentStatus('idle')
      return false
    }
  }, [campaign?.id])

  return {
    connect,
    addPayment,
    verifyPayment,
    getSummary,
    paymentStatus,
    setPaymentStatus,
    isConnecting,
  }
}

