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
import { ArrowLeft, Plus, Facebook, DollarSign, AlertCircle, CheckCircle2, ChevronDown, Building2, CreditCard, Loader2 } from "lucide-react"
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
import { useState, useEffect } from "react"
import { BudgetPanel } from "@/components/launch/budget-panel"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { useCampaignContext } from "@/lib/context/campaign-context"

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
  const [showBudgetPanel, setShowBudgetPanel] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const metaActions = useMetaActions()
  const { metaStatus: hookMetaStatus, paymentStatus: hookPaymentStatus, refreshStatus } = useMetaConnection()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
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
  
  // Handle disconnect with refresh
  const handleDisconnect = async () => {
    const success = await metaActions.disconnect()
    if (success) {
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

  // Add window focus listener to refresh status when popup closes
  useEffect(() => {
    const handleFocus = () => {
      // When window regains focus (popup closed), refresh status
      refreshStatus()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshStatus])

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
      return (
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2",
                paymentStatus === 'verified' 
                  ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                  : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/20"
              )}
            >
              {paymentStatus === 'verified' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              Meta Connected
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
            
            {hasPaymentIssue && (
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

  const getBudgetPill = () => {
    const isDisabled = metaConnectionStatus !== 'connected' || paymentStatus !== 'verified'
    
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowBudgetPanel(true)}
        disabled={isDisabled}
        className={cn(
          "gap-2",
          campaignBudget && !isDisabled && "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
        )}
      >
        <DollarSign className="h-4 w-4" />
        {campaignBudget ? `$${campaignBudget.toLocaleString()}` : 'Set Budget'}
      </Button>
    )
  }

  // Determine status badge
  const getStatusBadge = () => {
    // All-ads mode: show ad count
    if (mode === 'all-ads' && totalAds) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-foreground text-sm font-medium">
          📊 {totalAds} {totalAds === 1 ? 'Ad' : 'Ads'} in Campaign
        </div>
      )
    }
    
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
          
          {/* Meta Connection + Budget Pills (visible in build, edit, results, and all-ads modes) */}
          {(mode === 'build' || mode === 'edit' || mode === 'results' || mode === 'all-ads') && (
            <div className="flex items-center gap-2">
              {getMetaConnectionBadge()}
              {getBudgetPill()}
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
              onClick={onNewAd}
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
          currentBudget={campaignBudget}
          onSave={(budget) => {
            onBudgetUpdate?.(budget)
            setShowBudgetPanel(false)
          }}
        />
      )}
    </>
  )
}

