/**
 * Feature: Campaign Settings Modal
 * Purpose: Ultra-minimal settings display with inline controls
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Facebook,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
} from "lucide-react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { useBudget } from "@/lib/context/budget-context"
import { toast } from "sonner"
import { metaLogger } from "@/lib/meta/logger"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBudgetUpdate?: (budget: number) => Promise<void> | void
}

export function SettingsModal({
  open,
  onOpenChange,
  onBudgetUpdate,
}: SettingsModalProps) {
  const { campaign } = useCampaignContext()
  const { budgetState, setDailyBudget } = useBudget()
  const { metaStatus, paymentStatus } = useMetaConnection()
  const metaActions = useMetaActions()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSavingBudget, setIsSavingBudget] = useState(false)

  const isConnected = metaStatus === 'connected'
  const hasPaymentIssue = paymentStatus === 'missing' || paymentStatus === 'flagged'
  const summary = metaActions.getSummary()

  // Get campaign goal
  const campaignGoal = campaign?.initial_goal || 
    (campaign?.campaign_states as { goal_data?: { selectedGoal?: string } } | null | undefined)?.goal_data?.selectedGoal

  const goalLabels: Record<string, string> = {
    'leads': 'Leads',
    'website-visits': 'Website Visits',
    'calls': 'Calls',
  }

  const goalLabel = campaignGoal ? goalLabels[campaignGoal] || campaignGoal : 'Not set'

  // Get campaign budget
  const campaignBudget = campaign?.campaign_budget
  const dailyBudgetValue = campaignBudget && campaignBudget > 0 ? Math.round(campaignBudget / 30) : budgetState.dailyBudget

  const currencyCode = typeof budgetState.currency === 'string' && budgetState.currency.trim().length === 3
    ? budgetState.currency.trim().toUpperCase()
    : 'USD'

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
      console.warn("[SettingsModal] Currency formatting failed, falling back to USD.", error)
      return `$${Math.round(value).toLocaleString()}`
    }
  }

  const handleConnectClick = () => {
    setIsConnecting(true)
    metaActions.connect()
    setTimeout(() => setIsConnecting(false), 1000)
  }

  const handleBudgetChange = async (increment: number) => {
    if (!onBudgetUpdate || isSavingBudget) return

    const newDailyBudget = Math.max(1, dailyBudgetValue + increment)
    const totalBudget = Math.max(10, Math.round(newDailyBudget * 30))

    setIsSavingBudget(true)

    try {
      await Promise.resolve(onBudgetUpdate(totalBudget))
      setDailyBudget(newDailyBudget)
      toast.success(`Budget updated to ${formatCurrency(newDailyBudget)}/day`)
    } catch (error) {
      metaLogger.error('SettingsModal', 'Failed to update budget', error as Error)
      toast.error("We couldn't save your budget. Please try again.")
    } finally {
      setIsSavingBudget(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-xl">Campaign Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Meta Connection Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">Meta Connection</span>
              {isConnected && paymentStatus === 'verified' && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              {(hasPaymentIssue || !isConnected) && (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>

            {isConnected ? (
              <div className="space-y-1.5 text-sm">
                {summary?.business && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[80px]">Business:</span>
                    <span className="font-medium">{summary.business.name || summary.business.id}</span>
                  </div>
                )}
                {summary?.page && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[80px]">Facebook:</span>
                    <span className="font-medium">{summary.page.name || summary.page.id}</span>
                  </div>
                )}
                {summary?.instagram && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[80px]">Instagram:</span>
                    <span className="font-medium">@{summary.instagram.username || summary.instagram.id}</span>
                  </div>
                )}
                {summary?.adAccount && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[80px]">Ad Account:</span>
                    <span className="font-medium">{summary.adAccount.name || summary.adAccount.id}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
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
                      <Instagram className="h-4 w-4" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="border-t" />

          {/* Goal Section */}
          <div className="flex gap-2 text-sm">
            <span className="text-muted-foreground min-w-[80px]">Goal:</span>
            <span className="font-medium">{goalLabel}</span>
          </div>

          <div className="border-t" />

          {/* Budget Section */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground min-w-[80px]">Budget:</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBudgetChange(-5)}
                disabled={isSavingBudget || dailyBudgetValue <= 1}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-base min-w-[80px] text-center">
                {formatCurrency(dailyBudgetValue)}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBudgetChange(5)}
                disabled={isSavingBudget}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground">/day</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
