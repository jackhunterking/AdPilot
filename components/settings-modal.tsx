/**
 * Feature: Campaign Settings Modal
 * Purpose: Unified modal for Meta Connection, Goal, and Budget settings
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Facebook,
  Instagram,
  Building2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Flag,
  DollarSign,
} from "lucide-react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { BudgetDialog } from "@/components/launch/budget-dialog"
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
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)

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

  const handleAddPayment = () => {
    if (!summary?.adAccount?.id) return
    metaActions.addPayment(summary.adAccount.id)
  }

  const handleBudgetClick = () => {
    setShowBudgetDialog(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Campaign Settings</DialogTitle>
          </DialogHeader>

          <Accordion type="single" collapsible className="w-full" defaultValue="meta-connection">
            {/* Meta Connection Section */}
            <AccordionItem value="meta-connection">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Facebook className="h-5 w-5" />
                    <Instagram className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">Meta Connection</span>
                  {isConnected && paymentStatus === 'verified' && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {(hasPaymentIssue || !isConnected) && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-3">
                  {isConnected ? (
                    <>
                      {/* Connected State */}
                      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                        {summary?.business && (
                          <div className="flex items-start gap-3">
                            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Business</p>
                              <p className="font-medium">{summary.business.name || summary.business.id}</p>
                            </div>
                          </div>
                        )}

                        {summary?.page && (
                          <div className="flex items-start gap-3">
                            <Facebook className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Facebook Page</p>
                              <p className="font-medium">{summary.page.name || summary.page.id}</p>
                            </div>
                          </div>
                        )}

                        {summary?.instagram && (
                          <div className="flex items-start gap-3">
                            <Instagram className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Instagram</p>
                              <p className="font-medium">@{summary.instagram.username || summary.instagram.id}</p>
                            </div>
                          </div>
                        )}

                        {summary?.adAccount && (
                          <div className="flex items-start gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Ad Account</p>
                              <p className="font-medium">{summary.adAccount.name || summary.adAccount.id}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment Issue Warning */}
                      {hasPaymentIssue && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-red-900 dark:text-red-100 text-sm mb-2">
                                Payment Method Required
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                                Add a payment method to your ad account to publish ads.
                              </p>
                              <Button
                                size="sm"
                                onClick={handleAddPayment}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Add Payment Method
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Success State */}
                      {!hasPaymentIssue && paymentStatus === 'verified' && (
                        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                              Meta account connected and ready to publish ads
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Disconnected State */}
                      <div className="rounded-lg border border-border bg-muted/50 p-6 text-center space-y-4">
                        <div className="flex justify-center">
                          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Facebook className="h-8 w-8 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Connect Meta Account</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Connect your Facebook and Instagram accounts to publish ads
                          </p>
                        </div>
                        <Button
                          size="lg"
                          onClick={handleConnectClick}
                          disabled={isConnecting}
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Facebook className="h-5 w-5" />
                              <Instagram className="h-5 w-5" />
                              Connect Meta
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Goal Section */}
            <AccordionItem value="goal">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <Flag className="h-5 w-5" />
                  <span className="font-semibold">Campaign Goal</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Flag className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Selected Goal</p>
                          <p className="font-semibold text-lg">{goalLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      Campaign goals are set during campaign creation and cannot be changed once ads are published.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Budget Section */}
            <AccordionItem value="budget">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5" />
                  <span className="font-semibold">Budget</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Daily Budget</p>
                          <p className="font-semibold text-2xl">{formatCurrency(dailyBudgetValue)}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleBudgetClick}
                        variant="outline"
                        className="gap-2"
                      >
                        Change Budget
                      </Button>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Estimated monthly spend</span>
                        <span className="font-semibold">{formatCurrency(dailyBudgetValue * 30)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      Your daily budget is automatically distributed across all active ads in this campaign.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
      </Dialog>

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
            await Promise.resolve(onBudgetUpdate(totalBudget))
            setDailyBudget(dailyBudget)
            toast.success(`Budget saved at ${formatCurrency(dailyBudget)}/day`)
          } catch (error) {
            metaLogger.error('SettingsModal', 'Failed to save budget', error as Error)
            toast.error("We couldn't save your budget. Please try again.")
            throw error
          }
        }}
      />
    </>
  )
}

