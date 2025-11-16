/**
 * API Type Definitions for v1 Endpoints
 * Purpose: Standardized request/response types for type-safe API calls
 * References:
 *  - TypeScript: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
 */

import type { Database } from '@/lib/supabase/database.types'

// ============================================================================
// Standard API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: true
  data: T
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      totalItems: number
      totalPages: number
    }
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// ============================================================================
// Campaign Types
// ============================================================================

export type Campaign = Database['public']['Tables']['campaigns']['Row']
// DEPRECATED: campaign_states table removed in backend refactoring
// export type CampaignState = Database['public']['Tables']['campaign_states']['Row']

export interface CreateCampaignRequest {
  name?: string
  tempPromptId?: string
  prompt?: string
  goalType?: string
}

export interface UpdateCampaignRequest {
  name?: string
  status?: string
}

export interface ListCampaignsResponse {
  campaigns: Array<{
    id: string
    name: string
    status: string | null
    created_at: string | null
    updated_at: string | null
    campaign_states?: { ad_preview_data: unknown } | null
  }>
}

export interface GetCampaignResponse {
  campaign: Campaign
}

// ============================================================================
// Ad Types
// ============================================================================

export type Ad = Database['public']['Tables']['ads']['Row']

export interface CreateAdRequest {
  name: string
  campaignId: string
  status?: 'draft' | 'active'
  creative_data?: unknown
  copy_data?: unknown
  setup_snapshot?: unknown
}

export interface UpdateAdRequest {
  name?: string
  status?: string
  creative_data?: unknown
  copy_data?: unknown
  destination_type?: string
  destination_data?: unknown
  setup_snapshot?: unknown
}

export interface ListAdsResponse {
  ads: Ad[]
}

export interface GetAdResponse {
  ad: Ad
}

// ============================================================================
// Meta Connection Types
// ============================================================================

export interface MetaConnectionStatus {
  connected: boolean
  business?: {
    id: string
    name?: string
  } | null
  page?: {
    id: string
    name?: string
  } | null
  adAccount?: {
    id: string
    name?: string
    currency?: string
  } | null
  instagram?: {
    id: string
    username?: string
  } | null
  paymentConnected: boolean
  adminConnected: boolean
  adminBusinessRole?: string | null
  adminAdAccountRole?: string | null
  userAppConnected: boolean
  connectedAt?: string
  lastValidated?: string
  status?: string
}

export interface MetaAssets {
  businesses?: Array<{ id: string; name?: string }> | null
  pages?: Array<{ id: string; name?: string; access_token?: string }> | null
  adAccounts?: Array<{ id: string; name?: string; currency?: string }> | null
}

export interface PaymentStatus {
  paymentConnected: boolean
  adAccountId: string
  capabilities?: string[]
}

export interface AdminStatus {
  adminConnected: boolean
  businessRole?: string
  adAccountRole?: string
  checkedAt?: string
}

// ============================================================================
// Lead Types
// ============================================================================

export type Lead = Database['public']['Tables']['lead_form_submissions']['Row']

export interface LeadsListParams {
  campaignId: string
  page?: string
  pageSize?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: string
}

export interface ListLeadsResponse {
  leads: Lead[]
  columns: string[]
}

// ============================================================================
// Conversation Types
// ============================================================================

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']

export interface CreateConversationRequest {
  campaignId?: string
  title?: string
  metadata?: unknown
}

export interface UpdateConversationRequest {
  title?: string
  metadata?: unknown
}

export interface ListConversationsResponse {
  conversations: Conversation[]
}

export interface GetConversationResponse {
  conversation: Conversation
}

export interface ListMessagesResponse {
  messages: Message[]
}

