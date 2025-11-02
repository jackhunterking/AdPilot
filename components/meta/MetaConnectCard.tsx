"use client"

/**
 * Feature: Meta connect and payments
 * Purpose: Open FB.ui `ads_payment` with correct params and verify result
 * References:
 *  - Facebook JS SDK FB.ui: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Ad Account fields: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 */

import { Button } from "@/components/ui/button"
import { Link2, CreditCard, AlertTriangle } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { buildBusinessLoginUrl, generateRandomState } from "@/lib/meta/login"
import { metaStorage } from '@/lib/meta/storage'
import { metaLogger } from '@/lib/meta/logger'

export function MetaConnectCard({ mode = 'launch' }: { mode?: 'launch' | 'step' }) {
  const enabled = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ENABLE_META === 'true' : false
  const { campaign } = useCampaignContext()
  const [adAccountId, setAdAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  type Summary = {
    business?: { id: string; name?: string }
    page?: { id: string; name?: string }
    instagram?: { id: string; username?: string } | null
    adAccount?: { id: string; name?: string }
    paymentConnected?: boolean
    status?: string
    accountStatus?: string
    accountActive?: boolean
    adminConnected?: boolean
    adminBusinessRole?: string | null
    adminAdAccountRole?: string | null
    userAppConnected?: boolean
  }
  
  type AdsPaymentResponse = {
    error_message?: string
    error_code?: number
    success?: boolean
  }

  const [summary, setSummary] = useState<Summary | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'opening' | 'processing' | 'error' | 'success'>('idle')
  const requireAdmin = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_META_REQUIRE_ADMIN === 'true' : false
  const [verifyingAdmin, setVerifyingAdmin] = useState(false)
  const [accountValidation, setAccountValidation] = useState<{
    isActive: boolean
    status: number | null
    disableReason?: string
    hasFunding?: boolean
    hasToSAccepted?: boolean
    hasBusiness?: boolean
    capabilities?: string[]
    error?: string
  } | null>(null)
  const [validatingAccount, setValidatingAccount] = useState(false)

  const hydrate = useCallback(async () => {
    if (!enabled || !campaign?.id) return
    setLoading(true)
    try {
      metaLogger.debug('MetaConnectCard', 'Hydrating meta connection for campaign', {
        campaignId: campaign.id,
      })

      const connectionData = metaStorage.getConnection(campaign.id)
      if (!connectionData) {
        metaLogger.info('MetaConnectCard', 'No connection data found in localStorage', {
          campaignId: campaign.id,
        })
        setSummary(null)
        setAdAccountId(null)
        return
      }

      const summary = metaStorage.getConnectionSummary(campaign.id)
      metaLogger.debug('MetaConnectCard', 'Connection summary loaded from localStorage', {
        hasBusinessId: !!summary?.business?.id,
        hasPageId: !!summary?.page?.id,
        hasAdAccountId: !!summary?.adAccount?.id,
        hasInstagram: !!summary?.instagram?.id,
        paymentConnected: summary?.paymentConnected,
        status: summary?.status,
      })

      setSummary(summary as Summary)
      setAdAccountId(summary?.adAccount?.id ?? null)

      // Validate account status if ad account is selected
      if (summary?.adAccount?.id) {
        setValidatingAccount(true)
        try {
          metaLogger.info('MetaConnectCard', 'Validating ad account', {
            accountId: summary.adAccount.id,
          })
          const statusRes = await fetch(
            `/api/meta/adaccount/status?campaignId=${encodeURIComponent(campaign.id)}&accountId=${encodeURIComponent(summary.adAccount.id)}`,
            { cache: 'no-store' }
          )
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            setAccountValidation(statusData)
            metaLogger.debug('MetaConnectCard', 'Account validation result', {
              isActive: statusData.isActive,
              status: statusData.status,
              disableReason: statusData.disableReason,
              hasFunding: statusData.hasFunding,
            })
          } else {
            metaLogger.error('MetaConnectCard', 'Account validation failed', new Error(`Status: ${statusRes.status}`), {
              status: statusRes.status,
              statusText: statusRes.statusText,
              accountId: summary.adAccount.id,
            })
          }
        } catch (error) {
          metaLogger.error('MetaConnectCard', 'Account validation error', error as Error, {
            accountId: summary.adAccount.id,
          })
        } finally {
          setValidatingAccount(false)
        }
      }
    } catch (error) {
      metaLogger.error('MetaConnectCard', 'Hydration error', error as Error, {
        campaignId: campaign.id,
      })
    } finally {
      setLoading(false)
    }
  }, [enabled, campaign?.id])

  useEffect(() => { void hydrate() }, [hydrate])

  // SDK Readiness Detection
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => {
      const fb = (window as unknown as { FB?: { init?: unknown } }).FB
      if (fb && typeof fb.init === 'function') {
        setSdkReady(true)
      }
    }
    check()
    const interval = setInterval(check, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('meta') === 'connected') {
      void hydrate()
      try {
        url.searchParams.delete('meta')
        window.history.replaceState(null, '', url.toString())
      } catch {}
    }
  }, [hydrate])

  // Listen for popup → parent postMessage from bridge page
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: MessageEvent) => {
      try {
        if (event.origin !== window.location.origin) return
        const data = event.data as unknown
        const t = (data && typeof data === 'object' && data !== null ? (data as { type?: string }).type : undefined)

        if (t === 'META_CONNECTED' || t === 'meta-connected') {
          metaLogger.info('MetaConnectCard', 'Received META_CONNECTED message')

          // Extract connection data from message
          const messageData = data as {
            type: string
            campaignId: string
            status: string
            connectionData?: {
              type: 'system' | 'user_app'
              user_id: string
              fb_user_id: string
              long_lived_user_token?: string
              token_expires_at?: string
              user_app_token?: string
              user_app_token_expires_at?: string
              user_app_fb_user_id?: string
              selected_business_id?: string
              selected_business_name?: string
              selected_page_id?: string
              selected_page_name?: string
              selected_page_access_token?: string
              selected_ig_user_id?: string
              selected_ig_username?: string
              selected_ad_account_id?: string
              selected_ad_account_name?: string
            }
          }

          if (messageData.connectionData && campaign?.id) {
            metaLogger.info('MetaConnectCard', 'Storing connection data from message', {
              campaignId: campaign.id,
              type: messageData.connectionData.type,
              hasToken: !!(messageData.connectionData.long_lived_user_token || messageData.connectionData.user_app_token),
            })

            // Store connection data in localStorage
            metaStorage.setConnection(campaign.id, messageData.connectionData)
          }

          // Refresh from localStorage
          void hydrate()
        }
      } catch (error) {
        metaLogger.error('MetaConnectCard', 'Error handling META_CONNECTED message', error as Error)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [hydrate, campaign?.id])

  const onConnect = useCallback(() => {
    console.log('[MetaConnectCard] Connect button clicked')
    if (!enabled) {
      console.error('[MetaConnectCard] Meta integration is disabled')
      return
    }
    if (!campaign?.id) {
      console.error('[MetaConnectCard] Missing campaign ID')
      window.alert('Missing campaign id')
      return
    }
    // We no longer depend on FB.login for Business Login; we build and open the URL manually
    const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_SYSTEM || process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID
    if (!configId) {
      console.error('[MetaConnectCard] Missing Facebook config ID')
      window.alert('Missing NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID')
      return
    }
    
    const redirectUri = `${window.location.origin}/api/meta/auth/callback?type=system`
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID as string | undefined
    const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    if (!appId) {
      console.error('[MetaConnectCard] Missing NEXT_PUBLIC_FB_APP_ID')
      window.alert('Missing Facebook App ID')
      return
    }

    const state = generateRandomState(32)
    try { sessionStorage.setItem('meta_oauth_state', state) } catch {}

    const url = buildBusinessLoginUrl({
      appId,
      configId,
      redirectUri,
      graphVersion,
      state,
    })

    console.log('[MetaConnectCard] Initiating Meta login (manual URL):', {
      configId,
      graphVersion,
      redirectUri,
      campaignId: campaign.id,
      response_type: 'code',
      state_length: state.length,
      // Avoid logging full URL; show a redacted preview for diagnostics
      preview: url.replace(/state=[^&]+/, 'state=***'),
    })

    // Set cookie before opening popup
    const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
    document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`
    console.log('[MetaConnectCard] Cookie set:', { campaignId: campaign.id, expires })

    // Attempt to open popup
    let popup: Window | null = null
    try {
      popup = window.open(url, 'fb_biz_login', 'width=720,height=760,popup=yes')
    } catch (e) {
      console.error('[MetaConnectCard] Failed to open login popup:', e)
    }

    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      console.warn('[MetaConnectCard] Popup blocked - showing alert')
      const userWantsRedirect = window.confirm(
        'Pop-up was blocked by your browser!\n\n' +
        'To connect your Meta account:\n' +
        '1. Click "OK" to open in a new tab\n' +
        '2. Or enable pop-ups for this site and try again\n\n' +
        'Open in new tab?'
      )

      if (userWantsRedirect) {
        // Open in new tab instead
        const newTab = window.open(url, '_blank')
        if (!newTab) {
          // If even new tab is blocked, navigate current page as last resort
          console.error('[MetaConnectCard] New tab also blocked, navigating current page')
          window.location.href = url
        }
      }
    } else {
      // Popup opened successfully
      console.log('[MetaConnectCard] Popup opened successfully')
    }
  }, [enabled, campaign?.id])

  const onDisconnect = useCallback(async () => {
    metaLogger.info('MetaConnectCard', 'Disconnect button clicked')
    if (!enabled || !campaign?.id) {
      metaLogger.error('MetaConnectCard', 'Cannot disconnect - meta disabled or no campaign ID', new Error('Missing prerequisites'))
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to disconnect your Meta account?\n\n' +
      'This will remove all connected business, page, and ad account information. ' +
      'You will need to reconnect to continue using Meta integration.'
    )

    if (!confirmed) {
      metaLogger.info('MetaConnectCard', 'Disconnect cancelled by user')
      return
    }

    metaLogger.info('MetaConnectCard', 'Disconnecting campaign', {
      campaignId: campaign.id,
    })
    setLoading(true)
    try {
      // Clear localStorage
      metaStorage.clearAllData(campaign.id)
      metaLogger.info('MetaConnectCard', 'Connection disconnected and data cleared from localStorage')

      // Clear local state
      setSummary(null)
      setAdAccountId(null)
      setAccountValidation(null)
      setPaymentStatus('idle')

      // Refresh to confirm cleared state
      await hydrate()
    } catch (error) {
      metaLogger.error('MetaConnectCard', 'Error disconnecting', error as Error, {
        campaignId: campaign.id,
      })
      window.alert('Failed to disconnect Meta account. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [enabled, campaign?.id, hydrate])

  const onAddPayment = useCallback(async () => {
    if (!enabled || !adAccountId || !campaign?.id) return

    // Gate by admin verification if required
    // if (requireAdmin && summary?.adminConnected === false) {
    //   const bId = summary?.business?.id
    //   window.alert(
    //     'Admin access required to add a payment method. Please verify admin access first.\n\n' +
    //     'You may need Business Admin or Finance Editor on the Business and Ad Account.\n' +
    //     'Use "Verify Admin Access" or reconnect with an admin-enabled Facebook account.'
    //   )
    //   return
    // }

    // Check SDK readiness
    const fb = (typeof window !== 'undefined' ? (window as unknown as { FB?: unknown }).FB : null) as unknown as { ui?: (params: Record<string, unknown>, cb: (response: AdsPaymentResponse) => void) => void } | null
    if (!fb || typeof fb.ui !== 'function') {
      window.alert('Facebook SDK is not ready yet. Please wait and try again.')
      return
    }

    if (!sdkReady) {
      window.alert('Facebook SDK is still loading. Please wait a moment and try again.')
      return
    }

    // Log account validation status
    console.info('[MetaConnect] Account validation before payment:', accountValidation)

    // Warn if account validation failed or shows issues
    if (accountValidation && !accountValidation.isActive) {
      const reason = accountValidation.disableReason || 'unknown reason'
      const confirmMsg = `Warning: Ad account appears to be inactive (status: ${accountValidation.status}, reason: ${reason}).\n\nThis may cause the payment dialog to fail. Do you want to try anyway?`
      if (!window.confirm(confirmMsg)) {
        return
      }
    }

    // Normalize to act_ form for internal use
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    const idNoPrefix = actId.replace(/^act_/i, '')
    
    // Feature flag to test both formats
    // Testing confirmed: numeric-only format works; act_ prefix causes 404 errors
    const USE_ACT_PREFIX = false
    const dialogAccountId = USE_ACT_PREFIX ? actId : idNoPrefix

    // Verify we have the minimum required data
    if (!idNoPrefix || !/^\d+$/.test(idNoPrefix)) {
      console.error('[MetaConnect] Invalid account ID format:', actId)
      window.alert('Invalid ad account ID format. Please reconnect your Meta account.')
      return
    }

    // Log comprehensive debug info including format being tested
    console.info('[MetaConnect] Opening payment dialog with enhanced diagnostics:', {
      format: USE_ACT_PREFIX ? 'act_<id> (prefixed)' : 'numeric only',
      dialogAccountId,
      originalAdAccountId: adAccountId,
      normalizedActId: actId,
      numericId: idNoPrefix,
      accountStatus: accountValidation?.status,
      isActive: accountValidation?.isActive,
      hasFunding: accountValidation?.hasFunding,
      hasBusiness: accountValidation?.hasBusiness,
      hasToSAccepted: accountValidation?.hasToSAccepted,
      capabilities: accountValidation?.capabilities,
      sdkReady,
      timestamp: new Date().toISOString(),
    })

    // Log pre-flight check
    console.info('[MetaConnect] Pre-flight check passed:', {
      accountId: dialogAccountId,
      accountActive: accountValidation?.isActive,
      accountStatus: accountValidation?.status,
      hasBusiness: accountValidation?.hasBusiness,
      sdkReady,
      campaignId: campaign.id,
    })

    setPaymentStatus('opening')

    // Enhanced implementation with proper SDK initialization and error tracking
    try {
      type FBInitCfg = { appId: string; cookie: boolean; xfbml: boolean; version: string }
      type FBLike = { 
        init?: (cfg: FBInitCfg) => void
        ui?: (params: Record<string, unknown>, cb: (resp: AdsPaymentResponse) => void) => void
        getAccessToken?: () => string | null
      }
      const fbObj = (typeof window !== 'undefined' ? (window as unknown as { FB?: unknown }).FB : undefined) as unknown as FBLike | undefined
      
      if (!fbObj || typeof fbObj.ui !== 'function' || typeof fbObj.init !== 'function') {
        console.error('[MetaConnect] Facebook SDK methods not available')
        window.alert('Facebook SDK is not ready. Please wait and try again.')
        setPaymentStatus('error')
        return
      }

      const appId = process.env.NEXT_PUBLIC_FB_APP_ID as string | undefined
      const dialogVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'

      if (!appId) {
        console.error('[MetaConnect] Missing NEXT_PUBLIC_FB_APP_ID')
        window.alert('Facebook App ID is not configured. Please contact support.')
        setPaymentStatus('error')
        return
      }

      // Check if SDK is already initialized by checking for access token
      const isInitialized = fbObj.getAccessToken && typeof fbObj.getAccessToken === 'function'
      
      const initSafe = (version: string) => {
        try {
          console.info('[MetaConnect] Initializing Facebook SDK', { 
            version, 
            appId: appId?.substring(0, 4) + '...',
            alreadyInitialized: isInitialized,
          })
          fbObj?.init?.({ appId, cookie: true, xfbml: true, version })
        } catch (error) {
          console.error('[MetaConnect] SDK init error:', error)
        }
      }

      // Only reinitialize if needed
      if (!isInitialized) {
        console.info('[MetaConnect] SDK not initialized, initializing now')
        initSafe(dialogVersion)
        // Give SDK time to fully initialize
        console.info('[MetaConnect] Waiting 500ms for SDK to fully initialize...')
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        console.info('[MetaConnect] SDK already initialized, proceeding immediately')
      }

      // Prepare FB.ui parameters
      const params = { 
        method: 'ads_payment', 
        account_id: dialogAccountId, 
        display: 'popup' 
      } as Record<string, unknown>

      console.info('[MetaConnect] Calling FB.ui with params:', params)

      // Track dialog open attempt
      const dialogOpenTime = Date.now()

      fbObj.ui(params, (response: AdsPaymentResponse) => {
        const responseTime = Date.now() - dialogOpenTime
        setPaymentStatus('processing')
        
        // Enhanced response logging with detailed diagnostics
        console.info('[FB.ui][ads_payment] Response received with comprehensive diagnostics:', {
          response,
          responseType: typeof response,
          wasUndefined: response === undefined,
          wasNull: response === null,
          hasError: !!response?.error_message,
          hasSuccess: !!response?.success,
          responseTimeMs: responseTime,
          allKeys: response ? Object.keys(response) : [],
          timestamp: new Date().toISOString(),
          accountIdUsed: dialogAccountId,
          formatUsed: USE_ACT_PREFIX ? 'act_<id>' : 'numeric',
        })

        // Log full response object for debugging
        try {
          console.info('[FB.ui][ads_payment] Full response object:', JSON.stringify(response, null, 2))
        } catch (stringifyError) {
          console.error('[FB.ui][ads_payment] Could not stringify response:', stringifyError)
        }

        // Handle undefined/null response (dialog closed without interaction or failed to load)
        if (response === undefined || response === null) {
          setPaymentStatus('error')
          console.error('[FB.ui][ads_payment] Dialog failed - Response is null/undefined', {
            likelyCause: 'Dialog failed to load, user closed dialog, or SDK error',
            accountId: dialogAccountId,
            format: USE_ACT_PREFIX ? 'act_<id>' : 'numeric',
            suggestion: USE_ACT_PREFIX 
              ? 'Try toggling USE_ACT_PREFIX to false to test numeric-only format'
              : 'Try toggling USE_ACT_PREFIX to true to test act_ prefix format',
          })
          return
        }

        // Handle error response
        if (response?.error_message) {
          setPaymentStatus('error')
          console.error('[FB.ui][ads_payment] Error response received:', {
            error_message: response.error_message,
            error_code: response.error_code,
            accountId: dialogAccountId,
            format: USE_ACT_PREFIX ? 'act_<id>' : 'numeric',
            fullResponse: response,
          })
          window.alert(`Payment dialog error: ${response.error_message}`)
          return
        }

        // Success case
        console.info('[FB.ui][ads_payment] Dialog completed successfully')
        
        // Do not mark connected here; rely on server verification below
      })

      console.info('[MetaConnect] FB.ui called successfully, waiting for response...')

    } catch (e) {
      console.error('[MetaConnect] Exception while calling FB.ui:', {
        error: e,
        errorMessage: e instanceof Error ? e.message : String(e),
        errorStack: e instanceof Error ? e.stack : undefined,
        accountId: dialogAccountId,
      })
      setPaymentStatus('error')
      window.alert('Failed to open payment dialog. Please try again or add payment directly in Facebook Business Manager.')
      return
    }

    // Server-side verification fallback (works even without FB.ui callback)
    void (async () => {
      try {
        // give FB a moment to process
        console.info('[MetaConnect] Starting server-side payment verification in 3 seconds...')
        await new Promise((r) => setTimeout(r, 3000))

        console.info('[MetaConnect] Checking payment status with server...', {
          campaignId: campaign.id,
          adAccountId: actId,
        })

        const verify = await fetch(
          `/api/meta/payment/status?campaignId=${encodeURIComponent(campaign.id)}&adAccountId=${encodeURIComponent(actId)}`,
          { cache: 'no-store' }
        )

        if (verify.ok) {
          const json = await verify.json() as { connected?: boolean }
          console.info('[MetaConnect] Server payment verification response:', json)

          if (json?.connected) {
            console.info('[MetaConnect] Server verified payment connected; updating localStorage')
            setPaymentStatus('success')

            // Update localStorage
            metaStorage.markPaymentConnected(campaign.id)
            metaLogger.info('MetaConnectCard', 'Payment marked as connected in localStorage', {
              campaignId: campaign.id,
            })

            void hydrate()
          } else {
            console.info('[MetaConnect] Server verification: payment not yet connected')
          }
        } else {
          console.error('[MetaConnect] Server verification failed:', {
            status: verify.status,
            statusText: verify.statusText,
          })
        }
      } catch (verifyError) {
        console.error('[MetaConnect] Server verification exception:', verifyError)
      }
    })()
  }, [enabled, adAccountId, campaign?.id, sdkReady, accountValidation, hydrate, summary])

  const onVerifyAdmin = useCallback(async () => {
    if (!enabled || !campaign?.id) return
    setVerifyingAdmin(true)
    try {
      metaLogger.info('MetaConnectCard', 'Starting admin verification', {
        campaignId: campaign.id,
        summary: {
          hasBusinessId: !!summary?.business?.id,
          businessId: summary?.business?.id,
          hasAdAccountId: !!summary?.adAccount?.id,
          adAccountId: summary?.adAccount?.id,
          userAppConnected: summary?.userAppConnected,
          adminConnected: summary?.adminConnected,
        },
      })

      const res = await fetch('/api/meta/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      })

      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string; requiresUserLogin?: boolean }
        metaLogger.error('MetaConnectCard', 'Admin verify failed', new Error(e?.error || 'Unknown error'), {
          status: res.status,
        })

        // Show specific message if user login is required
        if (e?.requiresUserLogin) {
          window.alert(
            'User login required for admin verification.\n\n' +
            'Please complete step 2: "Login with Facebook (User Access)" first, then try verifying admin access again.'
          )
        } else {
          window.alert(e?.error || 'Failed to verify admin access. Please try again.')
        }
        return
      }

      const result = await res.json() as {
        adminConnected?: boolean
        businessRole?: string | null
        adAccountRole?: string | null
      }

      metaLogger.info('MetaConnectCard', 'Admin verify result received', {
        adminConnected: result?.adminConnected,
        businessRole: result?.businessRole,
        adAccountRole: result?.adAccountRole,
      })

      // Update localStorage with admin status
      metaStorage.updateAdminStatus(campaign.id, {
        admin_connected: result.adminConnected || false,
        admin_business_role: result.businessRole || undefined,
        admin_ad_account_role: result.adAccountRole ?? undefined,
      })

      metaLogger.info('MetaConnectCard', 'Admin status updated in localStorage')

      await hydrate()
      if (result?.adminConnected) {
        window.alert('Admin access verified successfully.')
      } else {
        window.alert('Admin access not verified. Please ensure you are Business Admin or Finance Editor on both Business and Ad Account.')
      }
    } catch (e) {
      metaLogger.error('MetaConnectCard', 'Admin verify exception', e as Error)
      window.alert('Failed to verify admin access. Please try again later.')
    } finally {
      setVerifyingAdmin(false)
    }
  }, [enabled, campaign?.id, hydrate, summary])

  const onUserLogin = useCallback(() => {
    console.log('[MetaConnectCard] User login button clicked')
    if (!enabled) return
    if (!campaign?.id) {
      window.alert('Missing campaign id')
      return
    }

    console.log('[MetaConnectCard] User login button clicked', {
      enabled,
      campaignId: campaign?.id,
    });
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID as string | undefined
    const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_USER || process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID
    if (!appId || !configId) {
      console.error('[MetaConnectCard] Missing app/config for user login', { hasAppId: !!appId, hasConfig: !!configId })
      window.alert('Missing Facebook App/Config for user login')
      return
    }
    const redirectUri = `${window.location.origin}/api/meta/auth/callback?type=user`
    const state = generateRandomState(32)
    try { sessionStorage.setItem('meta_oauth_state', state) } catch {}
    const url = buildBusinessLoginUrl({ appId, configId, redirectUri, graphVersion, state })
    console.log('[MetaConnectCard] Initiating User Login (Business Login)', {
      configId,
      graphVersion,
      redirectUri,
      campaignId: campaign.id,
    })

    // Set cookie before opening popup
    const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
    document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`

    // Attempt to open popup
    let popup: Window | null = null
    try {
      popup = window.open(url, 'fb_biz_login_user', 'width=720,height=760,popup=yes')
    } catch (e) {
      console.error('[MetaConnectCard] Failed to open user login popup:', e)
    }

    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      console.warn('[MetaConnectCard] User login popup blocked - showing alert')
      const userWantsRedirect = window.confirm(
        'Pop-up was blocked by your browser!\n\n' +
        'To login with Facebook (User Access):\n' +
        '1. Click "OK" to open in a new tab\n' +
        '2. Or enable pop-ups for this site and try again\n\n' +
        'Open in new tab?'
      )

      if (userWantsRedirect) {
        const newTab = window.open(url, '_blank')
        if (!newTab) {
          console.error('[MetaConnectCard] New tab also blocked, navigating current page')
          window.location.href = url
        }
      }
    } else {
      console.log('[MetaConnectCard] User login popup opened successfully')
    }
  }, [enabled, campaign?.id])
  console.log('[MetaConnectCard] Summary:', summary)

  return (
    <div className="rounded-lg border panel-surface p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="icon-tile-muted rounded-md flex items-center justify-center shrink-0">
            <Link2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Connect Facebook & Instagram</p>
            <p className="text-xs text-muted-foreground">
              {!enabled
                ? 'This feature is currently disabled.'
                : loading
                ? 'Loading your Meta assets…'
                : (summary?.status === 'connected' || summary?.status === 'selected_assets')
                ? 'Connected - manage your connection below'
                : 'Connect to start advertising on Facebook & Instagram'}
            </p>
          </div>
          {(summary?.status === 'connected' || summary?.status === 'selected_assets' || summary?.business?.id || summary?.page?.id || summary?.adAccount?.id) ? (
            <Button 
              size="sm" 
              type="button" 
              disabled={!enabled || loading} 
              onClick={onDisconnect} 
              variant="outline"
              className="h-8 px-4"
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              size="sm" 
              type="button" 
              disabled={!enabled || loading} 
              onClick={onConnect} 
              className="h-8 px-4"
            >
              Connect with Meta
            </Button>
          )}
        </div>

        {/* Business Details Card */}
        {(summary?.business?.id || summary?.page?.id || summary?.adAccount?.id) && (
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3 space-y-2">
            <div className="text-xs font-medium text-green-900 dark:text-green-200">
              Connected Accounts
            </div>
            <div className="space-y-1.5">
              {summary.business?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Business:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.business.name || summary.business.id}
                  </span>
                </div>
              )}
              
              {summary.page?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Page:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.page.name || summary.page.id}
                  </span>
                </div>
              )}
              {summary.instagram?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Instagram:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    @{summary.instagram.username || summary.instagram.id}
                  </span>
                </div>
              )}
              {summary.adAccount?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ad Account:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.adAccount.name || summary.adAccount.id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connect as Admin Section - MOVED OUTSIDE green card */}
        {summary?.business?.id && summary?.adAccount?.id && (
          <div className="rounded-md border p-3 space-y-2 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-200">Admin Access Required</div>
              {summary?.adminConnected && summary?.userAppConnected ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">✓ Ready</span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">Setup Required</span>
              )}
            </div>

            <div className="text-xs text-blue-700 dark:text-blue-300">
              To add payment methods, you need Business Admin or Finance Editor permissions.
            </div>

            <div className="flex flex-col gap-2">
              {/* Admin Verification Status */}
              <div className="flex items-center justify-between text-xs">
                <span>1. Admin permissions verified:</span>
                {summary?.adminConnected ? (
                  <span className="text-green-700 dark:text-green-300 font-medium">✓ Verified</span>
                ) : (
                  <Button size="sm" disabled={!enabled || verifyingAdmin} onClick={onVerifyAdmin} className="h-7 px-3">
                    {verifyingAdmin ? 'Verifying…' : 'Verify Admin Access'}
                  </Button>
                )}
              </div>

              {/* User App Connection Status */}
              <div className="flex items-center justify-between text-xs">
                <span>2. User app connected:</span>
                {summary?.userAppConnected ? (
                  <span className="text-green-700 dark:text-green-300 font-medium">✓ Connected</span>
                ) : (
                  <Button size="sm" variant="outline" disabled={!enabled} onClick={onUserLogin} className="h-7 px-3">
                    Login with Facebook (User Access)
                  </Button>
                )}
              </div>
            </div>

            {/* Helpful Links */}
            <div className="flex items-center gap-3 text-xs pt-1">
              <a
                href={summary?.business?.id ? `https://business.facebook.com/settings/people/?business_id=${summary.business.id}` : 'https://business.facebook.com/settings/people'}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-700 dark:text-blue-300"
              >
                Business Settings →
              </a>
              <Button size="sm" variant="ghost" disabled={!enabled || loading} onClick={onConnect} className="h-6 px-2 text-xs">
                Reconnect as Different User
              </Button>
            </div>
          </div>
        )}

        {summary?.adAccount && !summary?.paymentConnected ? (
          <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 space-y-3">
            {/* Show account validation status */}
            {validatingAccount && (
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Validating ad account...
              </div>
            )}
            
            {accountValidation && !accountValidation.isActive && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
                <div className="flex items-center gap-2 text-xs font-medium text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-3 w-3" />
                  Account Status Issue
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Status: {accountValidation.status} {accountValidation.disableReason && `(${accountValidation.disableReason})`}
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  This may prevent payment setup.{' '}
                  <a
                    href={`https://business.facebook.com/settings/ad-accounts/${summary.adAccount.id.replace('act_', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Check Business Settings →
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-900 dark:text-blue-200">Payment method required</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onAddPayment}
                  disabled={!sdkReady || paymentStatus === 'opening' || paymentStatus === 'processing' || !summary?.adAccount?.id}
                  className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {paymentStatus === 'opening' || paymentStatus === 'processing' ? 'Opening...' : 'Add Payment'}
                </Button>
              </div>
            </div>

            {/* Helper text with direct link to Ads Manager */}
            <div className="text-xs text-blue-700 dark:text-blue-300">
              If dialog fails, add payment directly in{' '}
              <a
                href={`https://business.facebook.com/settings/ad-accounts/${summary.adAccount.id.replace('act_', '')}/payment_methods`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Facebook Ads Manager →
              </a>
            </div>
          </div>
        ) : summary?.paymentConnected ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-700 dark:text-green-300">Payment method connected</span>
            </div>
          </div>
        ) : null}

        {!enabled && (
          <p className="text-[11px] text-muted-foreground">
            Meta integration is disabled. Set NEXT_PUBLIC_ENABLE_META=true to begin the clean rebuild.
          </p>
        )}
    </div>
  )
}


