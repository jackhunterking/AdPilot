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
  try {
    console.log(`[${CONTEXT}] Fetching campaign shared data`, { campaignId })

    // Fetch campaign record (for ai_conversation_id)
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, ai_conversation_id')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error(`[${CONTEXT}] Failed to fetch campaign`, campaignError)
      return null
    }

    // Fetch campaign_states (for goal, budget, meta connection)
    const { data: stateData, error: stateError } = await supabase
      .from('campaign_states')
      .select('goal_data, budget_data, meta_connection_data')
      .eq('campaign_id', campaignId)
      .single()

    if (stateError) {
      console.error(`[${CONTEXT}] Failed to fetch campaign state`, stateError)
      return null
    }

    const goalData = stateData.goal_data as { selectedGoal?: string; status?: string } | null
    const budgetData = stateData.budget_data as {
      dailyBudget?: number
      currency?: string
      isConnected?: boolean
      selectedAdAccount?: string | null
    } | null
    const metaConnectionData = stateData.meta_connection_data as MetaConnectionData | null

    const sharedData: CampaignSharedData = {
      campaignId,
      goal: goalData
        ? {
            selectedGoal: goalData.selectedGoal || 'leads',
            status: goalData.status || 'idle',
          }
        : undefined,
      budget: budgetData
        ? {
            dailyBudget: budgetData.dailyBudget || 20,
            currency: budgetData.currency || 'USD',
            isConnected: budgetData.isConnected || false,
            selectedAdAccount: budgetData.selectedAdAccount || null,
          }
        : undefined,
      metaConnection: metaConnectionData || null,
      aiConversationId: campaignData.ai_conversation_id || null,
    }

    console.log(`[${CONTEXT}] ✅ Campaign shared data loaded`, {
      campaignId,
      hasGoal: !!sharedData.goal,
      hasBudget: !!sharedData.budget,
      hasMetaConnection: !!sharedData.metaConnection,
      hasAiConversation: !!sharedData.aiConversationId,
    })

    return sharedData
  } catch (err) {
    console.error(`[${CONTEXT}] Exception loading campaign shared data`, err)
    return null
  }
}

/**
 * Get ad-specific data from database
 */
export async function getAdSpecificData(adId: string): Promise<AdSpecificData | null> {
  try {
    console.log(`[${CONTEXT}] Fetching ad-specific data`, { adId })

    const { data, error } = await supabase
      .from('ads')
      .select('id, campaign_id, name, status, setup_snapshot')
      .eq('id', adId)
      .single()

    if (error) {
      console.error(`[${CONTEXT}] Failed to fetch ad`, error)
      return null
    }

    const snapshot = data.setup_snapshot as SetupSnapshot | null

    const adData: AdSpecificData = {
      adId: data.id,
      campaignId: data.campaign_id,
      name: data.name,
      status: data.status,
      creative: snapshot?.creative,
      copy: snapshot?.copy,
      location: snapshot?.location,
      destination: snapshot?.destination,
    }

    console.log(`[${CONTEXT}] ✅ Ad-specific data loaded`, {
      adId,
      hasCreative: !!adData.creative,
      hasCopy: !!adData.copy,
      hasLocation: !!adData.location,
      hasDestination: !!adData.destination,
    })

    return adData
  } catch (err) {
    console.error(`[${CONTEXT}] Exception loading ad-specific data`, err)
    return null
  }
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
  try {
    console.log(`[${CONTEXT}] Updating campaign shared data`, {
      campaignId,
      fields: Object.keys(updates),
    })

    // Update campaign_states if goal or budget provided
    if (updates.goal || updates.budget) {
      const stateUpdates: Record<string, unknown> = {}

      if (updates.goal) {
        // Fetch existing goal_data and merge
        const { data: existingState } = await supabase
          .from('campaign_states')
          .select('goal_data')
          .eq('campaign_id', campaignId)
          .single()

        const existingGoal = (existingState?.goal_data as Record<string, unknown>) || {}
        stateUpdates.goal_data = { ...existingGoal, ...updates.goal }
      }

      if (updates.budget) {
        // Fetch existing budget_data and merge
        const { data: existingState } = await supabase
          .from('campaign_states')
          .select('budget_data')
          .eq('campaign_id', campaignId)
          .single()

        const existingBudget = (existingState?.budget_data as Record<string, unknown>) || {}
        stateUpdates.budget_data = { ...existingBudget, ...updates.budget }
      }

      const { error: stateError } = await supabase
        .from('campaign_states')
        .update(stateUpdates)
        .eq('campaign_id', campaignId)

      if (stateError) {
        console.error(`[${CONTEXT}] Failed to update campaign state`, stateError)
        return false
      }
    }

    // Update campaigns table if aiConversationId provided
    if (updates.aiConversationId !== undefined) {
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ ai_conversation_id: updates.aiConversationId })
        .eq('id', campaignId)

      if (campaignError) {
        console.error(`[${CONTEXT}] Failed to update campaign`, campaignError)
        return false
      }
    }

    console.log(`[${CONTEXT}] ✅ Campaign shared data updated`, { campaignId })
    return true
  } catch (err) {
    console.error(`[${CONTEXT}] Exception updating campaign shared data`, err)
    return false
  }
}

/**
 * Update ad-specific data (via setup_snapshot)
 */
export async function updateAdSpecificData(
  adId: string,
  updates: Partial<SetupSnapshot>
): Promise<boolean> {
  try {
    console.log(`[${CONTEXT}] Updating ad-specific data`, {
      adId,
      fields: Object.keys(updates),
    })

    // Fetch existing snapshot
    const { data: existingAd } = await supabase
      .from('ads')
      .select('setup_snapshot')
      .eq('id', adId)
      .single()

    const existingSnapshot = (existingAd?.setup_snapshot as SetupSnapshot) || {}

    // Merge updates with existing snapshot
    const mergedSnapshot: SetupSnapshot = {
      ...existingSnapshot,
      ...updates,
    }

    const { error } = await supabase
      .from('ads')
      .update({ setup_snapshot: mergedSnapshot as unknown as Json })
      .eq('id', adId)

    if (error) {
      console.error(`[${CONTEXT}] Failed to update ad snapshot`, error)
      return false
    }

    console.log(`[${CONTEXT}] ✅ Ad-specific data updated`, { adId })
    return true
  } catch (err) {
    console.error(`[${CONTEXT}] Exception updating ad-specific data`, err)
    return false
  }
}

