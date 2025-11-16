/**
 * Feature: Data Hierarchy Manager
 * Purpose: Enforce proper separation between campaign-level (shared) and ad-level (specific) data
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 *  - Data Architecture: Campaign vs Ad data hierarchy
 */

import { supabase } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { getCampaignMetaConnection, type MetaConnectionData } from './meta-connection-manager'
import type { SetupSnapshot } from '@/lib/context/current-ad-context'

const CONTEXT = 'DataHierarchyManager'

/**
 * Campaign-Level Data (Shared Across All Ads)
 */
export interface CampaignSharedData {
  campaignId: string
  goal?: {
    selectedGoal: string
    status: string
  }
  budget?: {
    dailyBudget: number
    currency: string
    isConnected: boolean
    selectedAdAccount: string | null
  }
  metaConnection?: MetaConnectionData | null
  aiConversationId?: string | null
}

/**
 * Ad-Level Data (Specific to Each Ad)
 */
export interface AdSpecificData {
  adId: string
  campaignId: string
  name: string
  status: string
  creative?: {
    imageUrl?: string
    imageVariations?: string[]
    baseImageUrl?: string
    selectedImageIndex?: number | null
    selectedCreativeVariation?: {
      gradient: string
      title: string
    } | null
  }
  copy?: {
    headline?: string
    body?: string
    primaryText?: string
    description?: string
    cta?: string
    variations?: Array<{
      headline: string
      body: string
      primaryText: string
      description: string
      cta: string
    }>
    selectedCopyIndex?: number | null
  }
  location?: {
    locations?: Array<{
      id: string
      name: string
      coordinates: [number, number]
      radius?: number
      type: 'radius' | 'city' | 'region' | 'country'
      mode: 'include' | 'exclude'
    }>
    status?: string
  }
  destination?: {
    url?: string
    callToAction?: string
    status?: string
    type?: 'website_url' | 'instant_form' | 'phone_number'
    formId?: string
    formName?: string
    phoneNumber?: string
    phoneFormatted?: string
  }
}

/**
 * Get campaign-level shared data from database
 */
export async function getCampaignSharedData(
  campaignId: string
): Promise<CampaignSharedData | null> {
  // DEPRECATED: campaign_states table removed - this function returns null
  // Use specific campaign/ads APIs instead
  console.log(`[${CONTEXT}] DEPRECATED - getCampaignSharedData no longer supported`)
  return null
}

/**
 * Get ad-specific data from database
 */
export async function getAdSpecificData(adId: string): Promise<AdSpecificData | null> {
  // DEPRECATED: setup_snapshot column removed - this function returns null
  // Use AdDataService instead
  console.log(`[${CONTEXT}] DEPRECATED - getAdSpecificData no longer supported`)
  return null
}

/**
 * Get complete data for an ad (campaign-level + ad-level)
 */
export async function getCompleteAdData(adId: string): Promise<{
  campaign: CampaignSharedData | null
  ad: AdSpecificData | null
} | null> {
  try {
    console.log(`[${CONTEXT}] Fetching complete ad data`, { adId })

    // First get ad to know campaign ID
    const adData = await getAdSpecificData(adId)

    if (!adData) {
      console.error(`[${CONTEXT}] Ad not found`, { adId })
      return null
    }

    // Then get campaign shared data
    const campaignData = await getCampaignSharedData(adData.campaignId)

    console.log(`[${CONTEXT}] ✅ Complete ad data loaded`, {
      adId,
      campaignId: adData.campaignId,
    })

    return {
      campaign: campaignData,
      ad: adData,
    }
  } catch (err) {
    console.error(`[${CONTEXT}] Exception loading complete ad data`, err)
    return null
  }
}

/**
 * Validate data hierarchy (ensure proper separation)
 */
export function validateDataHierarchy(data: {
  campaign?: Partial<CampaignSharedData>
  ad?: Partial<AdSpecificData>
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Campaign-level data should NOT contain ad-specific fields
  if (data.campaign) {
    const campaignData = data.campaign as Record<string, unknown>
    const adSpecificFields = ['creative', 'copy', 'location', 'destination']

    for (const field of adSpecificFields) {
      if (field in campaignData) {
        errors.push(`Campaign data should not contain ad-specific field: ${field}`)
      }
    }
  }

  // Ad-level data should NOT contain campaign-shared fields
  if (data.ad) {
    const adData = data.ad as Record<string, unknown>
    const campaignFields = ['goal', 'budget', 'metaConnection', 'aiConversationId']

    for (const field of campaignFields) {
      if (field in adData) {
        errors.push(`Ad data should not contain campaign-shared field: ${field}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Update campaign-level shared data
 */
export async function updateCampaignSharedData(
  campaignId: string,
  updates: {
    goal?: Partial<CampaignSharedData['goal']>
    budget?: Partial<CampaignSharedData['budget']>
    aiConversationId?: string
  }
): Promise<boolean> {
  // DEPRECATED: campaign_states table removed - use specific APIs instead
  console.log(`[${CONTEXT}] DEPRECATED - updateCampaignSharedData no longer supported`)
  return false
}

/**
 * Update ad-specific data (via setup_snapshot)
 */
export async function updateAdSpecificData(
  adId: string,
  updates: Partial<SetupSnapshot>
): Promise<boolean> {
  // DEPRECATED: setup_snapshot column removed - use specific ad APIs instead
  console.log(`[${CONTEXT}] DEPRECATED - updateAdSpecificData no longer supported`)
  return false
}

