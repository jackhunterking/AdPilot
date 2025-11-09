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
import { ArrowLeft, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkspaceMode, CampaignStatus } from "@/lib/types/workspace"

export interface WorkspaceHeaderProps {
  mode: WorkspaceMode
  onBack: () => void
  onNewAd?: () => void
  showNewAdButton?: boolean
  campaignStatus?: CampaignStatus
  abTestInfo?: {
    day: number
    totalDays: number
    testType: string
  }
  className?: string
}

export function WorkspaceHeader({
  mode,
  onBack,
  onNewAd,
  showNewAdButton = false,
  campaignStatus,
  abTestInfo,
  className,
}: WorkspaceHeaderProps) {
  // Determine back button text based on mode
  const getBackButtonText = () => {
    switch (mode) {
      case 'ab-test-builder':
      case 'edit':
      case 'build-variant':
        return 'Back to Results'
      case 'build':
      case 'results':
      case 'ab-test-active':
      case 'view-all-ads':
      default:
        return 'Back'
    }
  }

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

    if (mode === 'build' || mode === 'build-variant') {
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
    <div className={cn(
      "flex items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 flex-shrink-0",
      className
    )}>
      {/* Left: Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          {getBackButtonText()}
        </Button>
        
        {statusBadge}
      </div>

      {/* Right: New Ad Button (conditional) */}
      {showNewAdButton && onNewAd && (
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
  )
}

