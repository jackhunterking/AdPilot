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
import { ArrowLeft, Plus, Facebook, AlertCircle, CheckCircle2, ChevronDown, Building2, CreditCard, Rocket, Loader2, Save, ArrowRight, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { WorkspaceHeaderProps } from "@/lib/types/workspace"
import { useState, useEffect, useRef } from "react"
import { BudgetPanel } from "@/components/launch/budget-panel"
import { BudgetDialog } from "@/components/launch/budget-dialog"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useBudget } from "@/lib/context/budget-context"
import { metaStorage } from "@/lib/meta/storage"
import { metaLogger } from "@/lib/meta/logger"
import { toast } from "sonner"
import { emitMetaConnectionUpdated } from "@/lib/utils/meta-events"
import { SettingsModal } from "@/components/settings-modal"


export function WorkspaceHeader({
  mode,
  onBack,
  onNewAd,
  showBackButton = true,
  showNewAdButton,
  campaignStatus,
  abTestInfo,
  metaConnectionStatus: propsMetaStatus = 'disconnected',
  paymentStatus: propsPaymentStatus = 'unknown',
  campaignBudget,
  onMetaConnect,
  onBudgetUpdate,
  onSave,
  isSaveDisabled = false,
  // NEW PROPS
  currentStepId,
  isPublishReady = false,
  onSaveDraft,
  onPublish,
  isPublishing = false,
  currentAdId,
  onViewAllAds,
  isAdPublished = false,
  className,
}: WorkspaceHeaderProps) {
  const { campaign } = useCampaignContext()
  const { budgetState, setDailyBudget } = useBudget()
  const [showBudgetPanel, setShowBudgetPanel] = useState(false)
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const metaActions = useMetaActions()
  const { metaStatus: hookMetaStatus, paymentStatus: hookPaymentStatus } = useMetaConnection()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  // Use real-time hook status, fallback to props for SSR/initial render
  const metaConnectionStatus = hookMetaStatus || propsMetaStatus
  const paymentStatus = hookPaymentStatus || propsPaymentStatus
  
  // Don't show back button in all-ads mode
  const shouldShowBack = showBackButton && mode !== 'all-ads'
  
  // Determine if on final step (budget/launch step)
  const isOnFinalStep = currentStepId === 'budget'
  
  // Make badges read-only on launch step (budget step) - they are locked for the campaign
  const badgesReadOnly = isOnFinalStep
  
  // Check if editing a published ad (has meta_ad_id)
  const isEditingPublishedAd = mode === 'edit' && currentAdId
  
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
  
  // Meta disconnection is disabled to maintain campaign integrity
  // Once Meta is connected, users cannot disconnect as it breaks campaign logic

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
            
            // Emit event to notify all listeners (already done by setConnection, but being explicit)
            // This ensures immediate UI update across all components
            emitMetaConnectionUpdated(campaign.id)
            
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
                      // Emit event to notify all listeners of payment status update
                      emitMetaConnectionUpdated(campaign.id)
                      // Status will be read from localStorage on next mount
                    }
                  }
                })
                .catch((err) => {
                  metaLogger.error('WorkspaceHeader', 'Payment verification failed', err as Error)
                })
            }
            
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
  }, [campaign?.id, onMetaConnect])

  // Call onMetaConnect when connection status changes to connected
  useEffect(() => {
    if (metaConnectionStatus === 'connected' && onMetaConnect) {
      onMetaConnect()
    }
  }, [metaConnectionStatus, onMetaConnect])



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
        "flex items-center justify-between gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 flex-shrink-0",
        className
      )}>
        {/* Left: Back Button or "All Ads" Tab */}
        <div className="flex items-center gap-4">
          {mode === 'all-ads' ? (
            <div className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium text-sm">
              All Ads
            </div>
          ) : shouldShowBack && onBack ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-2 hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              {getBackButtonText()}
            </Button>
          ) : null}
        </div>

        {/* Right: Status Badge, Settings Button, Action Buttons */}
        <div className="flex items-center gap-4">
          {statusBadge}
          
          {/* Settings Button */}
          {(mode === 'build' || mode === 'edit' || mode === 'results' || mode === 'all-ads') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="h-8 w-8 p-0"
              title="Campaign Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          
          {/* Build mode - Final step: Save Draft + Publish */}
          {mode === 'build' && isOnFinalStep && onSaveDraft && onPublish && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveDraft}
                disabled={isSaveDisabled}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onPublish}
                disabled={!isPublishReady || isPublishing}
                className="gap-2"
                title={!isPublishReady ? "Complete all requirements to publish" : ""}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Publish
                  </>
                )}
              </Button>
            </>
          )}
          
          {/* Build mode - Non-final steps: No action buttons (stepper handles Next) */}
          {mode === 'build' && !isOnFinalStep && !showNewAdButton && (
            <div /> 
          )}
          
          {/* Edit mode - Published ad: Save Changes + Republish */}
          {mode === 'edit' && isEditingPublishedAd && onSave && onPublish && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                disabled={isSaveDisabled}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onPublish}
                disabled={!isPublishReady || isPublishing}
                className="gap-2"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Republishing...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Republish Changes
                  </>
                )}
              </Button>
            </>
          )}
          
          {/* Edit mode - Draft ad: Save only */}
          {mode === 'edit' && !isEditingPublishedAd && onSave && (
            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              disabled={isSaveDisabled}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          )}
          
          {/* New Ad button (shown in all-ads and results modes) */}
          {showNewAdButton && (
            <Button
              variant="default"
              size="sm"
              onClick={onNewAd}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Ad
            </Button>
          )}
          
          {/* Published Badge + View All Ads (shown after publishing in build mode) */}
          {mode === 'build' && isAdPublished && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Published
                </span>
              </div>
              {onViewAllAds && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAllAds}
                  className="gap-2"
                >
                  View in All Ads
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </>
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

      {/* Budget Dialog */}
      <BudgetDialog
        open={showBudgetDialog}
        onOpenChange={setShowBudgetDialog}
        currentBudget={campaignBudget}
        currency={currencyCode}
        onSave={async (dailyBudget) => {
          if (!onBudgetUpdate) {
            return
          }

          const totalBudget = Math.max(10, Math.round(dailyBudget * 30))
          
          try {
            await onBudgetUpdate(totalBudget)
            setDailyBudget(dailyBudget)
            toast.success(`Budget saved at ${formatCurrency(dailyBudget)}/day`)
          } catch (error) {
            metaLogger.error('WorkspaceHeader', 'Failed to save budget from dialog', error as Error)
            toast.error("We couldn't save your budget. Please try again.")
            throw error // Re-throw so dialog can show error state
          }
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        onBudgetUpdate={onBudgetUpdate}
      />

    </>
  )
}

