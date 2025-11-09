/**
 * Feature: Meta Integration & Budget Types
 * Purpose: Type-safe contracts for Meta connection, budget distribution, and launch confirmation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/database/tables
 */

export type MetaConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error' | 'expired'
export type PaymentStatus = 'unknown' | 'verified' | 'missing' | 'flagged'
export type BudgetStrategy = 'ai_distribute' | 'manual_override' | 'equal_split'
export type BudgetStatus = 'draft' | 'confirmed' | 'active' | 'paused' | 'depleted'

export interface MetaConnectionSummary {
  status: MetaConnectionStatus
  paymentStatus: PaymentStatus
  business?: { id: string; name?: string }
  page?: { id: string; name?: string }
  instagram?: { id: string; username?: string } | null
  adAccount?: { id: string; name?: string }
  lastVerifiedAt?: string
}

export interface BudgetAllocation {
  adId: string
  adName: string
  recommendedBudget: number
  reasonCode: string
  confidenceScore: number
  actualSpend: number
}

export interface CampaignBudget {
  campaignId: string
  totalBudget: number
  strategy: BudgetStrategy
  status: BudgetStatus
  allocations: BudgetAllocation[]
  lastDistributedAt?: string
}

export interface BudgetConfirmationPayload {
  campaignId: string
  totalBudget: number
  allocations: BudgetAllocation[]
  userAcknowledgedAt: string
}

export interface LaunchConfirmationData {
  campaignBudget: CampaignBudget
  metaConnection: MetaConnectionSummary
  canLaunch: boolean
  blockers: string[]
}

// API Request/Response types

export interface MetaConnectionResponse {
  connection: MetaConnectionSummary
  needsReconnect: boolean
}

export interface MetaConnectionRequest {
  campaignId: string
  redirectUrl: string
}

export interface BudgetDistributeRequest {
  campaignId: string
  totalBudget: number
  strategy: BudgetStrategy
}

export interface BudgetDistributeResponse {
  success: boolean
  budget: CampaignBudget
  distributedAt: string
}

export interface PublishRequest {
  budgetConfirmation: BudgetConfirmationPayload
  metaConnectionVerified: boolean
}

export interface PublishResponse {
  success: boolean
  metaCampaignId?: string
  metaAdSetId?: string
  metaAdIds?: string[]
  publishedAt: string
  errors?: string[]
}

