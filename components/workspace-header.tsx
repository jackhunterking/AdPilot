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
import { ArrowLeft, Plus, Facebook, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkspaceHeaderProps } from "@/lib/types/workspace"
import { useState } from "react"
import { MetaConnectionModal } from "@/components/meta/meta-connection-modal"
import { BudgetPanel } from "@/components/launch/budget-panel"

export function WorkspaceHeader({
  mode,
  onBack,
  onNewAd,
  showBackButton = true,
  showNewAdButton,
  campaignStatus,
  abTestInfo,
  totalAds,
  hasPublishedAds,
  metaConnectionStatus = 'disconnected',
  paymentStatus = 'unknown',
  campaignBudget,
  onMetaConnect,
  onBudgetUpdate,
  className,
}: WorkspaceHeaderProps) {
  const [showMetaModal, setShowMetaModal] = useState(false)
  const [showBudgetPanel, setShowBudgetPanel] = useState(false)
  
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

  const getMetaConnectionBadge = () => {
    if (metaConnectionStatus === 'connected' && paymentStatus === 'verified') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMetaModal(true)}
          className="gap-2 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/20"
        >
          <CheckCircle2 className="h-4 w-4" />
          Meta Connected
        </Button>
      )
    }
    
    if (metaConnectionStatus === 'error' || paymentStatus === 'missing' || paymentStatus === 'flagged') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMetaModal(true)}
          className="gap-2 bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/20"
        >
          <AlertCircle className="h-4 w-4" />
          Meta Issue
        </Button>
      )
    }
    
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMetaModal(true)}
        className="gap-2"
      >
        <Facebook className="h-4 w-4" />
        Connect Meta
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
          
          {/* Meta Connection + Budget Pills (only in build/edit modes) */}
          {(mode === 'build' || mode === 'edit') && (
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

      {/* Meta Connection Modal */}
      {showMetaModal && (
        <MetaConnectionModal
          open={showMetaModal}
          onOpenChange={setShowMetaModal}
          onSuccess={() => {
            onMetaConnect?.()
            setShowMetaModal(false)
          }}
        />
      )}

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

