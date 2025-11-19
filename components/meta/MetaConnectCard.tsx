"use client"

/**
 * Feature: Meta connect and payments
 * Purpose: Connect Meta Business assets and direct users to Facebook billing page for payment setup
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Ad Account fields: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 */

import { Button } from "@/components/ui/button"
import { Link2, CreditCard, AlertTriangle, Building2, Instagram as InstagramIcon, Wallet, FacebookIcon } from "lucide-react"
import { useCallback, useEffect, useState, useRef } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { metaStorage } from '@/lib/meta/storage'
import { metaLogger } from '@/lib/meta/logger'
import { useMetaActions } from '@/lib/hooks/use-meta-actions'

export function MetaConnectCard() {
  const enabled = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ENABLE_META === 'true' : false
  const { campaign } = useCampaignContext()
  const metaActions = useMetaActions()
  const [_adAccountId, setAdAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const eventDebounceTimer = useRef<NodeJS.Timeout | null>(null)
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
  const [capability, setCapability] = useState<{
    hasFinance: boolean
    hasManage: boolean
    hasFunding: boolean
  } | null>(null)
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
            `/api/v1/meta/status?campaignId=${encodeURIComponent(campaign.id)}&accountId=${encodeURIComponent(summary.adAccount.id)}`,
            { cache: 'no-store' }
          )
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            setAccountValidation(statusData)
            if (statusData && typeof statusData.currency === "string" && campaign?.id) {
              metaStorage.setConnection(campaign.id, {
                ad_account_currency_code: statusData.currency,
              })
            }
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

  // Fetch payment capability when ad account is selected
  useEffect(() => {
    const run = async () => {
      if (!enabled || !campaign?.id || !summary?.adAccount?.id) return
      try {
        const res = await fetch(`/api/v1/meta/payment?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json() as { hasFinance?: boolean; hasManage?: boolean; hasFunding?: boolean }
        setCapability({
          hasFinance: Boolean(json?.hasFinance),
          hasManage: Boolean(json?.hasManage),
          hasFunding: Boolean(json?.hasFunding),
        })
        if (json?.hasFunding && campaign?.id) {
          metaStorage.markPaymentConnected(campaign.id)
        }
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

            // Store connection data in localStorage (for client-side access)
            metaStorage.setConnection(campaign.id, messageData.connectionData)
            
            // CRITICAL: Persist to database for server-side publishing access
            fetch('/api/v1/meta/assets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                campaignId: campaign.id,
                connectionData: messageData.connectionData
              })
            })
              .then(async (res) => {
                if (res.ok) {
                  metaLogger.info('MetaConnectCard', '✅ Connection persisted to database')
                } else {
                  const errorData = await res.json().catch(() => ({}))
                  metaLogger.error('MetaConnectCard', '❌ Failed to persist connection to database', errorData)
                }
              })
              .catch((err) => {
                metaLogger.error('MetaConnectCard', '❌ Error persisting connection to database', err as Error)
              })
            
            // Refresh local state once
            void hydrate()
          }
        }
      } catch (error) {
        metaLogger.error('MetaConnectCard', 'Error handling META_CONNECTED message', error as Error)
      }
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      // Clean up debounce timer on unmount
      if (eventDebounceTimer.current) {
        clearTimeout(eventDebounceTimer.current)
      }
    }
  }, [hydrate, campaign?.id])

  const verifyPayment = useCallback(async () => {
    if (!enabled || !campaign?.id || !summary?.adAccount?.id) return
    
    const verified = await metaActions.verifyPayment(summary.adAccount.id)
    if (verified) {
          void hydrate()
    }
  }, [enabled, campaign?.id, summary?.adAccount?.id, metaActions, hydrate])

  // Page Visibility API: Auto-verify payment when user returns to tab
  useEffect(() => {
    if (!enabled || metaActions.paymentStatus !== 'processing') return
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && metaActions.paymentStatus === 'processing') {
        console.info('[MetaConnect] User returned to tab, verifying payment...')
        void verifyPayment()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, metaActions.paymentStatus, verifyPayment])

  const onConnect = useCallback(() => {
    if (!enabled) {
      console.error('[MetaConnectCard] Meta integration is disabled')
      return
    }
    metaActions.connect()
  }, [enabled, metaActions])

  // Meta disconnection is disabled to maintain campaign integrity
  // Once Meta is connected, users cannot disconnect as it breaks campaign logic

  const onAddPayment = useCallback(() => {
    if (!enabled || !summary?.adAccount?.id) return
    metaActions.addPayment(summary.adAccount.id)
  }, [enabled, summary?.adAccount?.id, metaActions])
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
            <div className="h-8 px-4 flex items-center text-xs font-medium text-green-700 dark:text-green-400">
              Connected
            </div>
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
                  {metaActions.paymentStatus === 'processing' ? 'Waiting for payment...' : 'Payment method required'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onAddPayment}
                  disabled={metaActions.paymentStatus === 'opening' || metaActions.paymentStatus === 'processing' || !summary?.adAccount?.id}
                  className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {metaActions.paymentStatus === 'processing' ? 'Verifying...' : metaActions.paymentStatus === 'opening' ? 'Opening...' : 'Add Payment'}
                </Button>
              </div>
            </div>

            {/* Helper text with direct link to Ads Manager */}
            <div className="text-xs text-blue-700 dark:text-blue-300">
              {metaActions.paymentStatus === 'processing' 
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


