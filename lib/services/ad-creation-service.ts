/**
 * Feature: Unified Ad Creation Service
 * Purpose: Centralized logic for creating ads (used by both Create Ad button and AI Chat)
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/insert
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import { createClient } from '@/lib/supabase/client'

const CONTEXT = 'AdCreationService'

export interface CreateAdParams {
  campaignId: string
  userId: string
  source: 'button' | 'ai-chat'
  name?: string
}

export interface CreateAdResult {
  success: boolean
  adId?: string
  conversationId?: string
  error?: string
}

/**
 * Create a new ad draft (centralized logic for button + AI chat)
 * Returns the ad ID and campaign-level conversation ID
 */
export async function createNewAd(params: CreateAdParams): Promise<CreateAdResult> {
  const { campaignId, userId, source, name } = params

  console.log(`[${CONTEXT}] Creating new ad`, {
    campaignId,
    userId,
    source,
    customName: !!name,
  })

  try {
    const supabase = createClient()

    // Step 1: Create draft ad in database
    const adName = name || `Draft Ad - ${new Date().toLocaleDateString()}`

    const { data: ad, error: adError } = await supabase
      .from('ads')
      .insert({
        campaign_id: campaignId,
        name: adName,
        status: 'draft',
        creative_data: null,
        copy_data: null,
        meta_ad_id: null,
        metrics_snapshot: null,
        setup_snapshot: null,
      })
      .select()
      .single()

    if (adError) {
      console.error(`[${CONTEXT}] Failed to create ad`, adError)
      return {
        success: false,
        error: `Failed to create ad: ${adError.message}`,
      }
    }

    console.log(`[${CONTEXT}] ✅ Created draft ad`, {
      adId: ad.id,
      name: ad.name,
      source,
    })

    // Step 2: Get campaign-level conversation ID (don't create new one)
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('ai_conversation_id')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error(`[${CONTEXT}] Failed to fetch campaign conversation ID`, campaignError)
      // Continue anyway - conversation can be created later
    }

    const conversationId = campaign?.ai_conversation_id || null

    console.log(`[${CONTEXT}] Using campaign-level conversation`, {
      campaignId,
      conversationId: conversationId || 'will be created on first message',
    })

    return {
      success: true,
      adId: ad.id,
      conversationId: conversationId || undefined,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[${CONTEXT}] Exception creating ad`, err)

    return {
      success: false,
      error: `Unexpected error: ${errorMessage}`,
    }
  }
}

/**
 * Get or create campaign-level conversation ID
 * Used by ad creation flow to ensure conversation persists across ads
 */
export async function getOrCreateCampaignConversation(
  campaignId: string,
  userId: string
): Promise<string | null> {
  const supabase = createClient()

  try {
    console.log(`[${CONTEXT}] Getting/creating campaign conversation`, { campaignId })

    // Check if campaign already has a conversation ID
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('ai_conversation_id')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error(`[${CONTEXT}] Failed to fetch campaign`, campaignError)
      return null
    }

    if (campaign.ai_conversation_id) {
      console.log(`[${CONTEXT}] Using existing conversation`, {
        conversationId: campaign.ai_conversation_id,
      })
      return campaign.ai_conversation_id
    }

    // Create new conversation for campaign
    const response = await fetch(`/api/campaigns/${campaignId}/conversation`, {
      method: 'POST',
    })

    if (!response.ok) {
      console.error(`[${CONTEXT}] Failed to create conversation`)
      return null
    }

    const data = await response.json()
    const conversationId = data.conversation.id

    console.log(`[${CONTEXT}] ✅ Created new conversation`, {
      campaignId,
      conversationId,
    })

    return conversationId
  } catch (err) {
    console.error(`[${CONTEXT}] Exception getting/creating conversation`, err)
    return null
  }
}

/**
 * Validate ad can be created (checks campaign exists, user has permission, etc.)
 */
export async function validateAdCreation(
  campaignId: string,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = createClient()

  try {
    // Check campaign exists and user owns it
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (error || !campaign) {
      return {
        valid: false,
        error: 'Campaign not found',
      }
    }

    if (campaign.user_id !== userId) {
      return {
        valid: false,
        error: 'You do not have permission to create ads in this campaign',
      }
    }

    return { valid: true }
  } catch (err) {
    return {
      valid: false,
      error: 'Failed to validate campaign',
    }
  }
}

