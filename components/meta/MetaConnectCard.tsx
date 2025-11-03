"use client"

/**
 * Feature: Meta connect and payments
 * Purpose: Connect Meta Business assets and direct users to Facebook billing page for payment setup
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Ad Account fields: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 */

import { Button } from "@/components/ui/button"
import { Link2, CreditCard, AlertTriangle, Building2, Facebook, Instagram as InstagramIcon, Wallet, FacebookIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { buildBusinessLoginUrl, generateRandomState } from "@/lib/meta/login"
import { metaStorage } from '@/lib/meta/storage'
import { metaLogger } from '@/lib/meta/logger'
import { getAdAccountBillingUrl } from '@/lib/meta/payment-urls'

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

  const [summary, setSummary] = useState<Summary | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'opening' | 'processing' | 'error' | 'success'>('idle')
  const [capability, setCapability] = useState<{
    hasFinance: boolean
    hasManage: boolean
    hasFunding: boolean
  } | null>(null)
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

  // Fetch payment capability when ad account is selected
  useEffect(() => {
    const run = async () => {
      if (!enabled || !campaign?.id || !summary?.adAccount?.id) return
      try {
        const res = await fetch(`/api/meta/payments/capability?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json() as { hasFinance?: boolean; hasManage?: boolean; hasFunding?: boolean }
        setCapability({
          hasFinance: Boolean(json?.hasFinance),
          hasManage: Boolean(json?.hasManage),
          hasFunding: Boolean(json?.hasFunding),
        })
      } catch {
        // ignore
      }
    }
    void run()
  }, [enabled, campaign?.id, summary?.adAccount?.id])


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

  const verifyPayment = useCallback(async () => {
    if (!enabled || !campaign?.id || !summary?.adAccount?.id) return
    
    const actId = summary.adAccount.id.startsWith('act_') ? summary.adAccount.id : `act_${summary.adAccount.id}`
    
    try {
      console.info('[MetaConnect] Verifying payment status...', {
        campaignId: campaign.id,
        adAccountId: actId,
      })

      const verify = await fetch(
        `/api/meta/payment/status?campaignId=${encodeURIComponent(campaign.id)}&adAccountId=${encodeURIComponent(actId)}`,
        { cache: 'no-store' }
      )

      if (verify.ok) {
        const json = await verify.json() as { connected?: boolean }
        console.info('[MetaConnect] Payment verification response:', json)

        if (json?.connected) {
          console.info('[MetaConnect] Payment verified as connected')
          setPaymentStatus('success')

          // Update localStorage
          metaStorage.markPaymentConnected(campaign.id)
          metaLogger.info('MetaConnectCard', 'Payment marked as connected in localStorage', {
            campaignId: campaign.id,
          })

          void hydrate()
        } else {
          console.info('[MetaConnect] Payment not yet connected')
          setPaymentStatus('idle')
        }
      } else {
        console.error('[MetaConnect] Payment verification failed:', {
          status: verify.status,
          statusText: verify.statusText,
        })
        setPaymentStatus('idle')
      }
    } catch (verifyError) {
      console.error('[MetaConnect] Payment verification exception:', verifyError)
      setPaymentStatus('idle')
    }
  }, [enabled, campaign?.id, summary?.adAccount?.id, hydrate])

  // Page Visibility API: Auto-verify payment when user returns to tab
  useEffect(() => {
    if (!enabled || paymentStatus !== 'processing') return
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && paymentStatus === 'processing') {
        console.info('[MetaConnect] User returned to tab, verifying payment...')
        void verifyPayment()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, paymentStatus, verifyPayment])

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

  const onAddPayment = useCallback(() => {
    if (!enabled || !summary?.adAccount?.id) return
    
    console.info('[MetaConnect] Opening Facebook billing page', {
      adAccountId: summary.adAccount.id,
    })

    setPaymentStatus('opening')
    
    // Open Facebook billing page in new tab
    const billingUrl = getAdAccountBillingUrl(summary.adAccount.id)
    window.open(billingUrl, '_blank', 'noopener,noreferrer')
    
    // Set status to processing (waiting for user to add payment)
    setPaymentStatus('processing')
    
    console.info('[MetaConnect] Billing page opened, waiting for user to return', {
      billingUrl,
    })
  }, [enabled, summary?.adAccount?.id])

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
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Business:
                  </span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.business.name || summary.business.id}
                  </span>
                </div>
              )}
              
              {summary.page?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <FacebookIcon className="h-3.5 w-3.5" />
                    Facebook Page:
                  </span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.page.name || summary.page.id}
                  </span>
                </div>
              )}
              {summary.instagram?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <InstagramIcon className="h-3.5 w-3.5" />
                    Instagram:
                  </span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    @{summary.instagram.username || summary.instagram.id}
                  </span>
                </div>
              )}
              {summary.adAccount?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" />
                    Ad Account:
                  </span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.adAccount.name || summary.adAccount.id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {summary?.adAccount && !(summary?.paymentConnected || capability?.hasFunding) ? (
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
                <span className="text-xs text-blue-900 dark:text-blue-200">
                  {paymentStatus === 'processing' ? 'Waiting for payment...' : 'Payment method required'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onAddPayment}
                  disabled={paymentStatus === 'opening' || paymentStatus === 'processing' || !summary?.adAccount?.id}
                  className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {paymentStatus === 'processing' ? 'Verifying...' : paymentStatus === 'opening' ? 'Opening...' : 'Add Payment'}
                </Button>
              </div>
            </div>

            {/* Helper text with direct link to Ads Manager */}
            <div className="text-xs text-blue-700 dark:text-blue-300">
              {paymentStatus === 'processing' 
                ? 'After adding payment on Facebook, return to this tab to continue.'
                : 'Click "Add Payment" to open Facebook billing page. After adding payment, return to this tab to continue.'}
            </div>
          </div>
        ) : (summary?.paymentConnected || capability?.hasFunding) ? (
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


