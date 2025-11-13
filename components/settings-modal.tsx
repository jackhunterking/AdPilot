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
import { Card } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"

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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <DialogTitle className="text-2xl font-semibold">Campaign Settings</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-5rem)] px-6 pb-6">
            <Accordion type="single" collapsible className="w-full" defaultValue="meta-connection">
              {/* Meta Connection Section */}
              <AccordionItem value="meta-connection" className="border-b">
                <AccordionTrigger className="py-5 hover:no-underline group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <div className="flex items-center gap-1">
                        <Facebook className="h-4 w-4 text-blue-600" />
                        <Instagram className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-semibold text-base">Meta Connection</span>
                      {isConnected && paymentStatus === 'verified' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {(hasPaymentIssue || !isConnected) && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-4 pt-4">
                    {isConnected ? (
                      <>
                        {/* Connected State - Grid Layout */}
                        <Card className="border-border bg-muted/50 p-6">
                          <div className="grid gap-5">
                            {summary?.business && (
                              <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Business</p>
                                  <p className="font-semibold text-base truncate">{summary.business.name || summary.business.id}</p>
                                </div>
                              </div>
                            )}

                            {summary?.page && (
                              <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                  <Facebook className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Facebook Page</p>
                                  <p className="font-semibold text-base truncate">{summary.page.name || summary.page.id}</p>
                                </div>
                              </div>
                            )}

                            {summary?.instagram && (
                              <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                  <Instagram className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Instagram</p>
                                  <p className="font-semibold text-base truncate">@{summary.instagram.username || summary.instagram.id}</p>
                                </div>
                              </div>
                            )}

                            {summary?.adAccount && (
                              <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                  <CreditCard className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Ad Account</p>
                                  <p className="font-semibold text-base truncate">{summary.adAccount.name || summary.adAccount.id}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>

                        {/* Payment Issue Warning */}
                        {hasPaymentIssue && (
                          <Card className="border-red-500/30 bg-red-500/5 p-5">
                            <div className="flex items-start gap-4">
                              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                                  Payment Method Required
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                                  Add a payment method to your ad account to publish ads.
                                </p>
                                <Button
                                  size="sm"
                                  onClick={handleAddPayment}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Add Payment Method
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )}

                        {/* Success State */}
                        {!hasPaymentIssue && paymentStatus === 'verified' && (
                          <Card className="border-green-500/30 bg-green-500/5 p-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              </div>
                              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                                Meta account connected and ready to publish ads
                              </p>
                            </div>
                          </Card>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Disconnected State */}
                        <Card className="border-border bg-muted/50 p-8 text-center">
                          <div className="space-y-5">
                            <div className="flex justify-center">
                              <div className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Facebook className="h-10 w-10 text-blue-600" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">Connect Meta Account</h3>
                              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                Connect your Facebook and Instagram accounts to publish ads
                              </p>
                            </div>
                            <Button
                              size="lg"
                              onClick={handleConnectClick}
                              disabled={isConnecting}
                              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
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
                        </Card>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Goal Section */}
              <AccordionItem value="goal" className="border-b">
                <AccordionTrigger className="py-5 hover:no-underline group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <Flag className="h-5 w-5 text-orange-600" />
                    </div>
                    <span className="font-semibold text-base">Campaign Goal</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-4 pt-4">
                    <Card className="border-border bg-muted/50 p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <Flag className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Selected Goal</p>
                          <p className="font-semibold text-xl">{goalLabel}</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="border-border bg-muted/30 p-5">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Campaign goals are set during campaign creation and cannot be changed once ads are published.
                      </p>
                    </Card>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Budget Section */}
              <AccordionItem value="budget" className="border-b-0">
                <AccordionTrigger className="py-5 hover:no-underline group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="font-semibold text-base">Budget</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-4 pt-4">
                    <Card className="border-border bg-muted/50 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <DollarSign className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Daily Budget</p>
                            <p className="font-bold text-3xl text-green-600">{formatCurrency(dailyBudgetValue)}</p>
                          </div>
                        </div>
                        <Button
                          size="default"
                          onClick={handleBudgetClick}
                          variant="outline"
                          className="gap-2 hover:bg-green-500/10 hover:text-green-700 hover:border-green-500/30 transition-colors"
                        >
                          Change Budget
                        </Button>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-medium">Estimated monthly spend</span>
                          <span className="text-lg font-bold">{formatCurrency(dailyBudgetValue * 30)}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="border-border bg-muted/30 p-5">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your daily budget is automatically distributed across all active ads in this campaign.
                      </p>
                    </Card>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
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
