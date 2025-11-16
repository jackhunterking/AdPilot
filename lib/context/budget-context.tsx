/**
 * Feature: Launch - Budget Context
 * Purpose: Manage launch-step budget state, including currency sourced from Meta ad accounts.
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction#core-concepts
 *  - AI Elements: https://ai-sdk.dev/elements/overview#components
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway#overview
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 */

"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"
import { logger } from "@/lib/utils/logger"
import { metaStorage } from "@/lib/meta/storage"

interface BudgetState {
  dailyBudget: number
  selectedAdAccount: string | null
  isConnected: boolean
  currency: string
  startTime?: string | null
  endTime?: string | null
  timezone?: string | null
}

interface BudgetContextType {
  budgetState: BudgetState
  setDailyBudget: (budget: number) => void
  setSelectedAdAccount: (accountId: string) => void
  setIsConnected: (connected: boolean) => void
  setSchedule: (opts: { startTime?: string | null; endTime?: string | null; timezone?: string | null }) => void
  setCurrency: (currency: string) => void
  resetBudget: () => void
  isComplete: () => boolean
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { campaign } = useCampaignContext()
  const [budgetState, setBudgetState] = useState<BudgetState>({
    dailyBudget: 20,
    selectedAdAccount: null,
    isConnected: false,
    currency: "USD",
    startTime: null,
    endTime: null,
    timezone: null,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedBudgetState = useMemo(() => budgetState, [budgetState])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    // Load budget from campaign.campaign_budget_cents and metadata
    const metadata = campaign.metadata as {
      budget?: Partial<BudgetState>
    } | null
    
    const budgetCents = campaign.campaign_budget_cents
    const savedData = metadata?.budget
    
    if (budgetCents || savedData) {
      logger.debug('BudgetContext', '✅ Restoring budget state from campaign')
      setBudgetState(prev => ({
        ...prev,
        dailyBudget: typeof budgetCents === 'number' ? budgetCents / 100 : prev.dailyBudget,
        selectedAdAccount: typeof savedData?.selectedAdAccount === "string" ? savedData.selectedAdAccount : prev.selectedAdAccount,
        isConnected: typeof savedData?.isConnected === "boolean" ? savedData.isConnected : prev.isConnected,
        currency: campaign.currency_code || prev.currency,
        startTime: savedData?.startTime === undefined ? prev.startTime : savedData.startTime,
        endTime: savedData?.endTime === undefined ? prev.endTime : savedData.endTime,
        timezone: savedData?.timezone === undefined ? prev.timezone : savedData.timezone,
      }))
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Sync budget state with Meta connection summary (localStorage) once initialized
  useEffect(() => {
    if (!campaign?.id || !isInitialized) return
    if (typeof window === "undefined") return

    try {
      const summary = metaStorage.getConnectionSummary(campaign.id)
      const connection = metaStorage.getConnection(campaign.id)

      if (!summary && !connection) {
        return
      }

      setBudgetState(prev => {
        let changed = false
        const next: BudgetState = { ...prev }

        const adAccountId = summary?.adAccount?.id ?? connection?.selected_ad_account_id ?? null
        if (adAccountId && prev.selectedAdAccount !== adAccountId) {
          next.selectedAdAccount = adAccountId
          changed = true
        }

        const isConnected =
          Boolean(
            summary?.status === "connected" ||
              summary?.status === "selected_assets" ||
              summary?.status === "payment_linked" ||
              connection?.ad_account_payment_connected ||
              adAccountId,
          )

        if (isConnected && !prev.isConnected) {
          next.isConnected = true
          changed = true
        }

        const currencyCandidate = summary?.adAccount?.currency ?? connection?.ad_account_currency_code ?? null
        if (currencyCandidate) {
          const normalized = currencyCandidate.trim().toUpperCase()
          if (normalized.length === 3 && normalized !== prev.currency) {
            next.currency = normalized
            changed = true
          }
        }

        return changed ? next : prev
      })
    } catch (error) {
      console.error("[BudgetContext] Failed to sync Meta connection summary", error)
    }
  }, [campaign?.id, isInitialized])

  // Save function (save to campaign.metadata for state, campaign.campaign_budget_cents for budget)
  const saveFn = useCallback(async (state: BudgetState) => {
    if (!campaign?.id || !isInitialized) return
    
    // Budget auto-save now happens through the budget API endpoint
    logger.debug('BudgetContext', 'Budget save triggered', { dailyBudget: state.dailyBudget })
    // Actual save happens through specific API calls, not auto-save
  }, [campaign?.id, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedBudgetState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  useEffect(() => {
    if (!campaign?.id) return
    if (!budgetState.selectedAdAccount) return
    const accountId = budgetState.selectedAdAccount

    const applyCurrency = (value: string | null | undefined) => {
      if (!value) return
      const normalized = value.trim().toUpperCase()
      if (normalized.length !== 3) return
      setBudgetState(prev => (prev.currency === normalized ? prev : { ...prev, currency: normalized }))
    }

    const connection = metaStorage.getConnection(campaign.id)
    if (connection?.ad_account_currency_code) {
      applyCurrency(connection.ad_account_currency_code)
      return
    }

    if (budgetState.currency && budgetState.currency !== "USD") {
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const fetchCurrency = async () => {
      try {
        const res = await fetch(
          `/api/meta/adaccount/status?campaignId=${encodeURIComponent(campaign.id)}&accountId=${encodeURIComponent(accountId)}`,
          { cache: "no-store", signal: controller.signal },
        )
        if (!res.ok) return
        const data: unknown = await res.json()
        const currency = typeof (data as { currency?: unknown }).currency === "string"
          ? (data as { currency?: string }).currency
          : undefined
        if (cancelled || !currency) return
        applyCurrency(currency)
        metaStorage.setConnection(campaign.id, { ad_account_currency_code: currency })
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    void fetchCurrency()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [campaign?.id, budgetState.selectedAdAccount, budgetState.currency])

  const setDailyBudget = (budget: number) => {
    setBudgetState(prev => ({ ...prev, dailyBudget: budget }))
  }

  const setSelectedAdAccount = (accountId: string) => {
    setBudgetState(prev => {
      if (prev.selectedAdAccount === accountId) return prev
      return { ...prev, selectedAdAccount: accountId, currency: "USD" }
    })
  }

  const setIsConnected = (connected: boolean) => {
    setBudgetState(prev => ({ ...prev, isConnected: connected }))
  }

  const setSchedule = ({ startTime, endTime, timezone }: { startTime?: string | null; endTime?: string | null; timezone?: string | null }) => {
    setBudgetState(prev => ({
      ...prev,
      startTime: startTime === undefined ? prev.startTime : startTime,
      endTime: endTime === undefined ? prev.endTime : endTime,
      timezone: timezone === undefined ? prev.timezone : timezone,
    }))
  }

  const setCurrency = (currency: string) => {
    setBudgetState(prev => {
      const normalized = typeof currency === "string" ? currency.trim().toUpperCase() : prev.currency
      if (normalized.length !== 3 || normalized === prev.currency) {
        return prev
      }
      return { ...prev, currency: normalized }
    })
  }

  const resetBudget = () => {
    setBudgetState({
      dailyBudget: 20,
      selectedAdAccount: null,
      isConnected: false,
      currency: "USD",
      startTime: null,
      endTime: null,
      timezone: null,
    })
  }

  const isComplete = () => {
    return budgetState.dailyBudget > 0 && budgetState.selectedAdAccount !== null
  }

  return (
    <BudgetContext.Provider 
      value={{ 
        budgetState, 
        setDailyBudget,
        setSelectedAdAccount,
        setIsConnected,
        setSchedule,
        setCurrency,
        resetBudget,
        isComplete
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}

