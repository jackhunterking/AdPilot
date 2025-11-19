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

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useCurrentAd } from "@/lib/context/current-ad-context"
import { useAdService } from "@/lib/services/service-provider"
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
  const { currentAd } = useCurrentAd()
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
  const adService = useAdService()

  // Load from backend (single source of truth)
  useEffect(() => {
    if (!campaign?.id || !currentAd?.id || isInitialized) return
    
    const loadBudgetFromBackend = async () => {
      try {
        logger.debug('BudgetContext', `Loading budget from backend for ad ${currentAd.id}`)
        
        // Use service layer instead of direct fetch (microservices pattern)
        const result = await adService.getSnapshot.execute(currentAd.id)
        
        if (!result.success || !result.data) {
          logger.warn('BudgetContext', 'Failed to load snapshot, using campaign-level budget')
          // Fallback to campaign-level budget
          const budgetCents = campaign.campaign_budget_cents
          setBudgetState(prev => ({
            ...prev,
            dailyBudget: typeof budgetCents === 'number' ? budgetCents / 100 : prev.dailyBudget,
            currency: campaign.currency_code || prev.currency
          }))
          setIsInitialized(true)
          return
        }
        
        const snapshot = result.data
        
        if (snapshot?.budget) {
          logger.info('BudgetContext', '✅ Loaded budget from backend')
          setBudgetState(prev => ({
            ...prev,
            dailyBudget: snapshot.budget?.dailyBudget ?? prev.dailyBudget,
            currency: snapshot.budget?.currency ?? prev.currency,
            startTime: snapshot.budget?.schedule?.startTime ?? prev.startTime,
            endTime: snapshot.budget?.schedule?.endTime ?? prev.endTime,
            timezone: snapshot.budget?.schedule?.timezone ?? prev.timezone
          }))
        } else {
          logger.debug('BudgetContext', 'No budget in backend, using defaults')
        }
        
        setIsInitialized(true)
      } catch (err) {
        logger.error('BudgetContext', 'Error loading budget from backend', err)
        setIsInitialized(true)
      }
    }
    
    loadBudgetFromBackend()
  }, [campaign?.id, currentAd?.id, isInitialized, campaign])

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

