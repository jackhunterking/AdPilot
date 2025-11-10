/**
 * Feature: Workspace Header
 * Purpose: Clean header navigation with context-aware back button and new ad creation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Facebook, DollarSign, AlertCircle, CheckCircle2, ChevronDown, Building2, CreditCard, Loader2, Minus, Plus as PlusIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { WorkspaceHeaderProps } from "@/lib/types/workspace"
import { useState, useEffect, useRef } from "react"
import { BudgetPanel } from "@/components/launch/budget-panel"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useBudget } from "@/lib/context/budget-context"
import { metaStorage } from "@/lib/meta/storage"
import { metaLogger } from "@/lib/meta/logger"
import { toast } from "sonner"

// Meta Account Status Constants (from Graph API docs)
const META_ACCOUNT_STATUS = {
  ACTIVE: 1,
  DISABLED: 2,
  UNSETTLED: 3,
  PENDING_RISK_REVIEW: 7,
  PENDING_SETTLEMENT: 8,
  IN_GRACE_PERIOD: 9,
  PENDING_CLOSURE: 100,
  CLOSED: 101,
} as const

export function WorkspaceHeader({
  mode,
  onBack,
  onNewAd,
  showBackButton = true,
  showNewAdButton,
  campaignStatus,
  abTestInfo,
  totalAds,
  metaConnectionStatus: propsMetaStatus = 'disconnected',
  paymentStatus: propsPaymentStatus = 'unknown',
  campaignBudget,
  onMetaConnect,
  onBudgetUpdate,
  className,
}: WorkspaceHeaderProps) {
  const { campaign } = useCampaignContext()
  const { budgetState, setDailyBudget } = useBudget()
  const [showBudgetPanel, setShowBudgetPanel] = useState(false)
  const [showBudgetConfirm, setShowBudgetConfirm] = useState(false)
  const [isBudgetSaving, setIsBudgetSaving] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showNewAdConfirm, setShowNewAdConfirm] = useState(false)
  const metaActions = useMetaActions()
  const { metaStatus: hookMetaStatus, paymentStatus: hookPaymentStatus, refreshStatus } = useMetaConnection()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const paymentVerifiedRef = useRef(false)
  const [accountRestriction, setAccountRestriction] = useState<{
    isRestricted: boolean
    accountStatus?: number
    disableReason?: string
  } | null>(null)
  
  // Use real-time hook status, fallback to props for SSR/initial render
  const metaConnectionStatus = hookMetaStatus || propsMetaStatus
  const paymentStatus = hookPaymentStatus || propsPaymentStatus
  
  // Don't show back button in all-ads mode
  const shouldShowBack = showBackButton && mode !== 'all-ads'
  
  // Determine back button text based on mode
  const getBackButtonText = () => {
    switch (mode) {
      case 'build':             // NEW: Navigate to all-ads grid when building subsequent ads
      case 'results':
      case 'ab-test-builder':
      case 'edit':
        return 'Back to All Ads'  // All navigate to grid
      default:
        return 'Back'
    }
  }

  // Get summary for dropdown
  const summary = metaActions.getSummary()
  const isConnected = metaConnectionStatus === 'connected'
  const hasPaymentIssue = paymentStatus === 'missing' || paymentStatus === 'flagged'
  const currencyCode = typeof budgetState.currency === 'string' && budgetState.currency.trim().length === 3
    ? budgetState.currency.trim().toUpperCase()
    : 'USD'
  const dailyBudgetValue = budgetState.dailyBudget
  const estimatedMonthlyBudget = Math.max(0, Math.round(dailyBudgetValue * 30))
  const normalizedDailyBudget = Number.isFinite(dailyBudgetValue) && dailyBudgetValue > 0
    ? Math.round(dailyBudgetValue)
    : 20
  const [draftDailyBudget, setDraftDailyBudget] = useState<number>(normalizedDailyBudget)

  useEffect(() => {
    const next = Number.isFinite(dailyBudgetValue) && dailyBudgetValue > 0
      ? Math.round(dailyBudgetValue)
      : 20
    setDraftDailyBudget(prev => (prev === next ? prev : next))
  }, [dailyBudgetValue])

  const formatCurrency = (value: number) => {
    if (!Number.isFinite(value)) {
      return '$0'
    }

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(value)
    } catch (error) {
      console.warn("[WorkspaceHeader] Currency formatting failed, falling back to USD.", error)
      return `$${Math.round(value).toLocaleString()}`
    }
  }
  
  // Handle disconnect with refresh
  const handleDisconnect = async () => {
    const success = await metaActions.disconnect()
    if (success) {
      // Reset payment verification ref so it can re-verify on reconnect
      paymentVerifiedRef.current = false
      await refreshStatus()
      onMetaConnect?.()
    }
  }

  // Handle add payment with refresh
  const handleAddPayment = () => {
    if (!summary?.adAccount?.id) return
    metaActions.addPayment(summary.adAccount.id)
  }

  // Handle connect click - open popup immediately
  const handleConnectClick = () => {
    setIsConnecting(true)
    metaActions.connect()
    // Reset connecting state after popup opens (1 second)
    setTimeout(() => setIsConnecting(false), 1000)
  }

  // Listen for META_CONNECTED postMessage from OAuth popup
  useEffect(() => {
    if (!campaign?.id) return
    
    const handleMessage = (event: MessageEvent) => {
      try {
        // Validate origin
        if (event.origin !== window.location.origin) return
        
        const data = event.data as unknown
        const messageType = (data && typeof data === 'object' && data !== null ? (data as { type?: string }).type : undefined)
        
        if (messageType === 'META_CONNECTED' || messageType === 'meta-connected') {
          metaLogger.info('WorkspaceHeader', 'Received META_CONNECTED message')
          
          // Extract connection data from message
          const messageData = data as {
            type: string
            campaignId?: string
            status: string
            connectionData?: {
              type: 'system' | 'user_app'
              user_id?: string
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
              ad_account_currency_code?: string
              ad_account_payment_connected?: boolean
              admin_connected?: boolean
              admin_business_role?: string
              admin_ad_account_role?: string
              status?: string
            }
          }
          
          // Store connection data in localStorage
          if (messageData.connectionData) {
            metaLogger.info('WorkspaceHeader', 'Storing connection data', {
              campaignId: campaign.id,
              type: messageData.connectionData.type,
              hasToken: !!(messageData.connectionData.long_lived_user_token || messageData.connectionData.user_app_token),
            })
            
            // Save to localStorage with CURRENT campaign ID
            metaStorage.setConnection(campaign.id, messageData.connectionData)
            
            // If payment status wasn't checked or is false, verify it now
            const adAccountId = messageData.connectionData.selected_ad_account_id
            if (adAccountId && !messageData.connectionData.ad_account_payment_connected) {
              metaLogger.info('WorkspaceHeader', 'Verifying payment status', {
                campaignId: campaign.id,
                adAccountId,
              })
              
              // Verify payment status via API (non-blocking, pass ad account ID)
              fetch(`/api/meta/payments/capability?campaignId=${encodeURIComponent(campaign.id)}&adAccountId=${encodeURIComponent(adAccountId)}`, {
                cache: 'no-store'
              })
                .then(async (res) => {
                  if (res.ok) {
                    const data = await res.json() as { hasFunding?: boolean }
                    if (data.hasFunding) {
                      metaLogger.info('WorkspaceHeader', 'Payment verified via API, updating storage', {
                        campaignId: campaign.id,
                      })
                      // Update localStorage with payment connected
                      metaStorage.markPaymentConnected(campaign.id)
                      // Refresh status to update button
                      refreshStatus()
                    }
                  }
                })
                .catch((err) => {
                  metaLogger.error('WorkspaceHeader', 'Payment verification failed', err as Error)
                })
            }
            
            // Refresh status immediately
            refreshStatus()
            
            // Call onMetaConnect callback
            onMetaConnect?.()
          }
        }
      } catch (error) {
        metaLogger.error('WorkspaceHeader', 'Error handling META_CONNECTED message', error as Error)
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [campaign?.id, refreshStatus, onMetaConnect])
  
  // Add window focus listener to refresh status when popup closes
  useEffect(() => {
    const handleFocus = () => {
      // When window regains focus (popup closed), refresh status
      refreshStatus()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshStatus])

  // Auto-verify payment status for existing connections (fixes old data with hardcoded false)
  useEffect(() => {
    console.log('[WorkspaceHeader] Auto-verify useEffect triggered', {
      metaConnectionStatus,
      paymentStatus,
      campaignId: campaign?.id,
    })
    
    // Only verify if connected but payment shows missing
    if (metaConnectionStatus !== 'connected') {
      console.log('[WorkspaceHeader] Auto-verify SKIPPED: not connected', { metaConnectionStatus })
      return
    }
    
    if (paymentStatus !== 'missing') {
      console.log('[WorkspaceHeader] Auto-verify SKIPPED: payment not missing', { paymentStatus })
      return
    }
    
    if (!campaign?.id) {
      console.log('[WorkspaceHeader] Auto-verify SKIPPED: no campaign ID')
      return
    }
    
    // Get ad account ID from summary
    const summary = metaActions.getSummary()
    console.log('[WorkspaceHeader] Got summary for auto-verify', {
      hasSummary: !!summary,
      hasAdAccount: !!summary?.adAccount,
      adAccountId: summary?.adAccount?.id,
    })
    
    if (!summary?.adAccount?.id) {
      console.log('[WorkspaceHeader] Auto-verify SKIPPED: no ad account in summary')
      return
    }
    
    // Prevent repeated verification in same session
    if (paymentVerifiedRef.current) {
      console.log('[WorkspaceHeader] Auto-verify SKIPPED: already verified this session')
      return
    }
    
    console.log('[WorkspaceHeader] Auto-verify PROCEEDING - all conditions met!')
    paymentVerifiedRef.current = true
    
    metaLogger.info('WorkspaceHeader', 'Auto-verifying payment status on load', {
      campaignId: campaign.id,
      adAccountId: summary.adAccount.id,
      currentPaymentStatus: paymentStatus,
    })
    
    // Verify payment via API (pass ad account ID)
    fetch(`/api/meta/payments/capability?campaignId=${encodeURIComponent(campaign.id)}&adAccountId=${encodeURIComponent(summary.adAccount.id)}`, {
      cache: 'no-store'
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as { 
            hasFunding?: boolean
            isActive?: boolean
            accountStatus?: number
            disableReason?: string
          }
          
          metaLogger.info('WorkspaceHeader', 'Payment verification API response', {
            campaignId: campaign.id,
            hasFunding: data.hasFunding,
            isActive: data.isActive,
            accountStatus: data.accountStatus,
            disableReason: data.disableReason,
          })
          
          if (data.hasFunding) {
            // Payment exists! Update localStorage
            metaLogger.info('WorkspaceHeader', 'Payment verified as connected, updating localStorage', {
              campaignId: campaign.id,
            })
            metaStorage.markPaymentConnected(campaign.id)
            setAccountRestriction(null)
            
            // Refresh status to update button color
            refreshStatus()
          } else if (data.accountStatus === META_ACCOUNT_STATUS.DISABLED || data.accountStatus === META_ACCOUNT_STATUS.CLOSED) {
            // Account is restricted/disabled by Meta
            metaLogger.warn('WorkspaceHeader', 'Ad account is restricted by Meta', {
              campaignId: campaign.id,
              disableReason: data.disableReason,
              accountStatus: data.accountStatus,
            })
            
            // Store restriction info for UI display
            setAccountRestriction({
              isRestricted: true,
              accountStatus: data.accountStatus,
              disableReason: data.disableReason,
            })
            
            // Refresh status
            refreshStatus()
          } else {
            metaLogger.info('WorkspaceHeader', 'Payment confirmed as missing', {
              campaignId: campaign.id,
              isActive: data.isActive,
              accountStatus: data.accountStatus,
            })
            setAccountRestriction(null)
          }
        } else {
          metaLogger.error('WorkspaceHeader', 'Payment verification API failed', new Error(`Status: ${res.status}`))
        }
      })
      .catch((err) => {
        metaLogger.error('WorkspaceHeader', 'Payment verification request failed', err as Error)
      })
  }, [metaConnectionStatus, paymentStatus, campaign?.id, metaActions, refreshStatus])

  // Call onMetaConnect when connection status changes to connected
  useEffect(() => {
    if (metaConnectionStatus === 'connected' && onMetaConnect) {
      onMetaConnect()
    }
  }, [metaConnectionStatus, onMetaConnect])

  // Fallback check: If hook has default values but localStorage has connection, force refresh
  useEffect(() => {
    if (!campaign?.id) return
    
    console.log('[WorkspaceHeader] Current status from hook', {
      campaignId: campaign.id,
      hookMetaStatus,
      hookPaymentStatus,
      propsMetaStatus,
      propsPaymentStatus,
      effectiveMetaStatus: metaConnectionStatus,
      effectivePaymentStatus: paymentStatus,
    })
    
    // If hook still has default values, check localStorage directly
    if (hookMetaStatus === 'disconnected' && hookPaymentStatus === 'unknown') {
      const summary = metaActions.getSummary()
      
      console.log('[WorkspaceHeader] Checking localStorage directly', {
        hasSummary: !!summary,
        summaryStatus: summary?.status,
        hasAdAccount: !!summary?.adAccount?.id,
        paymentConnected: summary?.paymentConnected,
      })
      
      if (summary?.status === 'connected' || summary?.status === 'selected_assets' || summary?.status === 'payment_linked' || summary?.adAccount?.id) {
        // We have a connection that hook hasn't detected yet
        console.log('[WorkspaceHeader] Found connection in localStorage, forcing refresh')
        refreshStatus()
      }
    }
  }, [campaign?.id, hookMetaStatus, hookPaymentStatus, metaActions, refreshStatus, propsMetaStatus, propsPaymentStatus, metaConnectionStatus, paymentStatus])

  const getMetaConnectionBadge = () => {
    // Connected state - show dropdown
    if (isConnected) {
      // Determine button text based on restriction and payment status
      let buttonText = 'Meta Connected'
      if (accountRestriction?.isRestricted) {
        buttonText = 'Account Restricted'
      } else if (paymentStatus === 'flagged') {
        buttonText = 'Account Issue'
      } else if (paymentStatus === 'missing') {
        buttonText = 'Payment Required'
      }
      
      return (
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2",
                paymentStatus === 'verified' && !accountRestriction?.isRestricted
                  ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                  : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/20"
              )}
            >
              {paymentStatus === 'verified' && !accountRestriction?.isRestricted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {buttonText}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Connected Accounts
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {summary?.business && (
              <div className="px-2 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Business</span>
                </div>
                <div className="font-medium text-xs ml-5">
                  {summary.business.name || summary.business.id}
                </div>
              </div>
            )}
            
            {summary?.page && (
              <div className="px-2 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Facebook className="h-3.5 w-3.5" />
                  <span className="text-xs">Facebook Page</span>
                </div>
                <div className="font-medium text-xs ml-5">
                  {summary.page.name || summary.page.id}
                </div>
              </div>
            )}
            
            {summary?.instagram && (
              <div className="px-2 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Facebook className="h-3.5 w-3.5" />
                  <span className="text-xs">Instagram</span>
                </div>
                <div className="font-medium text-xs ml-5">
                  @{summary.instagram.username || summary.instagram.id}
                </div>
              </div>
            )}
            
            {summary?.adAccount && (
              <div className="px-2 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="text-xs">Ad Account</span>
                </div>
                <div className="font-medium text-xs ml-5">
                  {summary.adAccount.name || summary.adAccount.id}
                </div>
              </div>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Show restriction notice if account is restricted */}
            {accountRestriction?.isRestricted && (
              <>
                <div className="px-2 py-3 text-sm">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100 text-xs mb-1">
                        Account Restricted
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                        {accountRestriction.disableReason || 'This account has been disabled by Meta'}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Visit Facebook Business Manager to request a review
                      </p>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            
            {/* Only show Add Payment if NOT restricted (payment won't help with restriction) */}
            {hasPaymentIssue && !accountRestriction?.isRestricted && (
              <DropdownMenuItem onClick={handleAddPayment}>
                <CreditCard className="h-4 w-4 mr-2" />
                Add Payment
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={handleDisconnect} variant="destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    
    // Error state
    if (metaConnectionStatus === 'error' || hasPaymentIssue) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleConnectClick}
          disabled={isConnecting}
          className="gap-2 bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/20"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              Meta Issue
            </>
          )}
        </Button>
      )
    }
    
    // Disconnected state - show connect button
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnectClick}
        disabled={isConnecting}
        className="gap-2"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Facebook className="h-4 w-4" />
            Connect Meta
          </>
        )}
      </Button>
    )
  }

  const handleBudgetInputChange = (value: string) => {
    const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ''))
    if (Number.isNaN(parsed)) {
      setDraftDailyBudget(0)
      return
    }
    const normalized = Math.max(1, Math.round(parsed))
    setDraftDailyBudget(normalized)
    setDailyBudget(normalized)
  }

  const adjustDailyBudget = (delta: number) => {
    setDraftDailyBudget(prev => {
      const baseline = prev === 0 ? 0 : prev
      const next = Math.max(1, baseline + delta)
      setDailyBudget(next)
      return next
    })
  }

  const hasConfirmedBudget = typeof campaignBudget === 'number' && campaignBudget > 0
  const confirmedDailyBudget = hasConfirmedBudget
    ? Math.max(0, Math.round((campaignBudget ?? 0) / 30))
    : null
  const isBudgetControlsDisabled = metaConnectionStatus !== 'connected' || paymentStatus !== 'verified'
  const isBudgetDirty = hasConfirmedBudget
    ? draftDailyBudget !== (confirmedDailyBudget ?? 0)
    : draftDailyBudget > 0
  const canSaveBudget = !isBudgetControlsDisabled && isBudgetDirty && draftDailyBudget > 0

  const handleBudgetSave = async () => {
    if (!onBudgetUpdate) {
      setShowBudgetConfirm(false)
      return
    }

    if (!Number.isFinite(draftDailyBudget) || draftDailyBudget <= 0) {
      toast.error("Set a daily budget before saving.")
      return
    }

    const totalBudget = Math.max(10, Math.round(draftDailyBudget * 30))

    setIsBudgetSaving(true)
    try {
      await onBudgetUpdate(totalBudget)
      toast.success(`Budget saved at ${formatCurrency(draftDailyBudget)}/day`)
      setShowBudgetConfirm(false)
    } catch (error) {
      metaLogger.error('WorkspaceHeader', 'Failed to save budget from header controls', error as Error)
      toast.error("We couldn't save your budget. Please try again.")
    } finally {
      setIsBudgetSaving(false)
    }
  }

  const getBudgetControls = () => (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-lg border border-border px-3 py-2",
        isBudgetControlsDisabled && "opacity-60 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Budget</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => adjustDailyBudget(-5)}
            className="h-9 w-9"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={draftDailyBudget === 0 ? "" : draftDailyBudget}
            onChange={(event) => handleBudgetInputChange(event.target.value)}
            className="h-9 w-24 text-center text-base font-semibold"
            placeholder="0"
            aria-label="Daily budget amount"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => adjustDailyBudget(5)}
            className="h-9 w-9"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {currencyCode} per day
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setShowBudgetConfirm(true)}
          disabled={!canSaveBudget}
          className="gap-2"
        >
          {isBudgetSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )

  // Determine status badge
  const getStatusBadge = () => {
    if (abTestInfo) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          🧪 A/B Test Active (Day {abTestInfo.day} of {abTestInfo.totalDays})
        </div>
      )
    }

    if (mode === 'edit') {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Editing Live Campaign
        </div>
      )
    }

    if (campaignStatus === 'published' || campaignStatus === 'ab_test_active') {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live
        </div>
      )
    }

    if (campaignStatus === 'paused') {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-500/10 text-gray-600 dark:text-gray-400 text-sm font-medium">
          <span className="relative flex h-2 w-2 bg-gray-500 rounded-full"></span>
          Paused
        </div>
      )
    }

    if (mode === 'build') {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
          Draft
        </div>
      )
    }

    return null
  }

  const statusBadge = getStatusBadge()

  return (
    <>
      <div className={cn(
        "flex items-center justify-between gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 flex-shrink-0 border-b border-border",
        className
      )}>
        {/* Left: Back Button + Meta/Budget Pills */}
        <div className="flex items-center gap-4">
          {shouldShowBack && onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-2 hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              {getBackButtonText()}
            </Button>
          )}
          
          {/* Back to All Ads Button - visible when there are ads and not in all-ads mode */}
          {totalAds && totalAds > 0 && mode !== 'all-ads' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-2 hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to All Ads
            </Button>
          )}
          
          {/* Meta Connection + Budget Pills (visible in build, edit, results, and all-ads modes) */}
          {(mode === 'build' || mode === 'edit' || mode === 'results' || mode === 'all-ads') && (
            <div className="flex items-center gap-2">
              {getMetaConnectionBadge()}
              {getBudgetControls()}
            </div>
          )}
        </div>

        {/* Right: Status Badge and New Ad Button */}
        <div className="flex items-center gap-4">
          {statusBadge}
          {showNewAdButton && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowNewAdConfirm(true)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Ad
            </Button>
          )}
        </div>
      </div>

      {/* Budget Panel */}
      {showBudgetPanel && (
        <BudgetPanel
          open={showBudgetPanel}
          onOpenChange={setShowBudgetPanel}
          currentBudget={typeof campaignBudget === 'number' ? campaignBudget : estimatedMonthlyBudget || undefined}
          onSave={async (budget) => {
            if (!onBudgetUpdate) {
              setShowBudgetPanel(false)
              return
            }

            const derivedDaily = Math.max(1, Math.round(budget / 30))
            try {
              await onBudgetUpdate(budget)
              setDailyBudget(derivedDaily)
              toast.success(`Budget saved at ${formatCurrency(derivedDaily)}/day`)
              setShowBudgetPanel(false)
            } catch (error) {
              metaLogger.error('WorkspaceHeader', 'Failed to save budget from advanced panel', error as Error)
              toast.error("We couldn't save your budget. Please try again.")
            }
          }}
        />
      )}

      <Dialog
        open={showBudgetConfirm}
        onOpenChange={(open) => {
          if (!isBudgetSaving) {
            setShowBudgetConfirm(open)
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">Save Budget Changes?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              We&apos;ll apply the new budget to your campaign and redistribute spend across your ads.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">New daily budget</span>
              <span className="font-semibold text-foreground">{formatCurrency(draftDailyBudget)}</span>
            </div>
            {confirmedDailyBudget !== null && (
              <div className="mt-1 text-xs text-muted-foreground">
                Previously saved {formatCurrency(confirmedDailyBudget)}/day
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowBudgetConfirm(false)}
              disabled={isBudgetSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBudgetSave}
              disabled={isBudgetSaving}
              className="gap-2"
            >
              {isBudgetSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Ad Confirmation Dialog */}
      <Dialog open={showNewAdConfirm} onOpenChange={setShowNewAdConfirm}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">Create New Ad?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Starting a new ad will reset your current creative work. Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="text-amber-900 dark:text-amber-100">
              Your campaign settings (goal and budget) will be preserved. Only the ad creative will be reset.
            </p>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowNewAdConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowNewAdConfirm(false)
                onNewAd?.()
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}

