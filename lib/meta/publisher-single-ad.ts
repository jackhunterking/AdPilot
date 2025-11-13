/**
 * Feature: Single Ad Publisher
 * Purpose: Publish individual ads to Meta Marketing API
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/reference/ad/
 *  - Publishing Orchestrator: lib/meta/publishing/publish-orchestrator.ts
 */

import { supabaseServer } from '../supabase/server'
import { getConnectionWithToken } from './service'
import { createPublishLogger } from './observability/publish-logger'
import { createMetaAPIClient } from './publishing/meta-api-client'
import { createUploadOrchestrator } from './image-management/upload-orchestrator'
import { CreativePayloadGenerator } from './creative-generation/creative-payload-generator'
import type { PublishError, AdStatus } from '../types/workspace'
import type { GoalType, DestinationType } from './types/publishing'

export interface PublishSingleAdParams {
  campaignId: string
  adId: string
  userId: string
}

export interface PublishSingleAdResult {
  success: boolean
  metaAdId?: string
  status?: AdStatus
  error?: PublishError
}

/**
 * Publish a single ad to Meta
 */
export async function publishSingleAd(params: PublishSingleAdParams): Promise<PublishSingleAdResult> {
  const logger = createPublishLogger(params.campaignId, true)
  
  try {
    console.log('[PublishSingleAd] Starting single ad publish', { adId: params.adId })

    // ====================================================================
    // STEP 1: LOAD AD DATA
    // ====================================================================
    const { data: ad } = await supabaseServer
      .from('ads')
      .select(`
        id,
        campaign_id,
        name,
        status,
        setup_snapshot,
        copy_data,
        creative_data
      `)
      .eq('id', params.adId)
      .single()

    if (!ad) {
      throw new Error('Ad not found')
    }

    // ====================================================================
    // STEP 2: LOAD CAMPAIGN DATA
    // ====================================================================
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('*, campaign_states(*)')
      .eq('id', params.campaignId)
      .single()

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // ====================================================================
    // STEP 3: LOAD META CONNECTION
    // ====================================================================
    const connection = await getConnectionWithToken({ campaignId: params.campaignId })

    if (!connection || !connection.long_lived_user_token) {
      return {
        success: false,
        error: {
          code: 'token_expired',
          message: 'Meta connection not found',
          userMessage: 'Please reconnect your Facebook account',
          recoverable: true,
          suggestedAction: 'Reconnect Meta',
          timestamp: new Date().toISOString()
        }
      }
    }

    // ====================================================================
    // STEP 4: EXTRACT AD DATA
    // ====================================================================
    const setupSnapshot = (ad.setup_snapshot || {}) as Record<string, unknown>
    const copyData = (ad.copy_data || {}) as Record<string, unknown>
    const creativeData = (ad.creative_data || {}) as Record<string, unknown>
    
    // Get copy from setup_snapshot or copy_data
    const copy = (setupSnapshot.copy || copyData) as {
      headline?: string
      primaryText?: string
      description?: string
      cta?: string
    }
    
    // Get creative from setup_snapshot or creative_data
    const creative = (setupSnapshot.creative || creativeData) as {
      imageUrl?: string
      imageVariations?: string[]
      selectedImageIndex?: number
    }

    const selectedImageIndex = creative.selectedImageIndex ?? 0
    const imageUrl = creative.imageVariations?.[selectedImageIndex] || creative.imageUrl

    if (!imageUrl) {
      return {
        success: false,
        error: {
          code: 'validation_error',
          message: 'No image found for ad',
          userMessage: 'Please add an image to your ad',
          recoverable: true,
          suggestedAction: 'Edit ad and add image',
          timestamp: new Date().toISOString()
        }
      }
    }

    // ====================================================================
    // STEP 5: GET CAMPAIGN CONFIG
    // ====================================================================
    const stateRow = campaign.campaign_states as {
      goal_data?: {
        selectedGoal?: GoalType
        formData?: {
          id?: string
          websiteUrl?: string
          phoneNumber?: string
        }
      }
      budget_data?: {
        dailyBudget?: number
        selectedAdAccount?: string
      }
      location_data?: {
        locations?: Array<{
          key: string
          name: string
          type: string
        }>
      }
    } | null

    const goalData = stateRow?.goal_data || {}
    const budgetData = stateRow?.budget_data || {}
    const locationData = stateRow?.location_data || {}

    const goal = goalData.selectedGoal
    if (!goal) {
      return {
        success: false,
        error: {
          code: 'validation_error',
          message: 'Campaign goal not set',
          userMessage: 'Please set up your campaign goal',
          recoverable: true,
          suggestedAction: 'Complete campaign setup',
          timestamp: new Date().toISOString()
        }
      }
    }

    // Determine destination type
    let destinationType: DestinationType
    let destinationUrl: string | undefined
    let leadFormId: string | undefined
    let phoneNumber: string | undefined

    if (goal === 'leads') {
      if (goalData.formData?.id) {
        destinationType = 'form'
        leadFormId = goalData.formData.id
        destinationUrl = goalData.formData.websiteUrl
      } else {
        destinationType = 'website'
        destinationUrl = goalData.formData?.websiteUrl || 'https://example.com'
      }
    } else if (goal === 'calls') {
      destinationType = 'call'
      phoneNumber = goalData.formData?.phoneNumber
    } else {
      destinationType = 'website'
      destinationUrl = goalData.formData?.websiteUrl
    }

    // ====================================================================
    // STEP 6: INITIALIZE META API CLIENT
    // ====================================================================
    const apiClient = createMetaAPIClient(connection.long_lived_user_token, logger)
    const imageUploader = createUploadOrchestrator(
      connection.long_lived_user_token,
      connection.selected_ad_account_id!,
      logger
    )

    // ====================================================================
    // STEP 7: UPLOAD IMAGE
    // ====================================================================
    console.log('[PublishSingleAd] Uploading image to Meta', { imageUrl })
    
    const imageUploadResult = await imageUploader.uploadImagesWithRetry(
      [imageUrl],
      'feed',
      1,
      2
    )

    if (imageUploadResult.failed.size > 0) {
      return {
        success: false,
        error: {
          code: 'api_error',
          message: 'Image upload failed',
          userMessage: 'Failed to upload image to Meta. Please try again.',
          recoverable: true,
          suggestedAction: 'Retry publishing',
          timestamp: new Date().toISOString()
        }
      }
    }

    const imageHash = imageUploader.getImageHashMapping(imageUploadResult).get(imageUrl)

    // ====================================================================
    // STEP 8: CREATE CREATIVE
    // ====================================================================
    console.log('[PublishSingleAd] Creating ad creative')
    
    const creativeGenerator = new CreativePayloadGenerator()
    const creativeResult = creativeGenerator.generate({
      pageId: connection.selected_page_id!,
      instagramActorId: connection.selected_ig_user_id,
      goal,
      destinationType,
      destinationUrl,
      leadFormId,
      phoneNumber,
      primaryText: copy.primaryText || '',
      headline: copy.headline || '',
      description: copy.description,
      imageHash,
      variationIndex: 0
    })

    const creativeResponse = await apiClient.createAdCreative(
      connection.selected_ad_account_id!,
      creativeResult.payload as unknown as Record<string, unknown>
    )

    if (!creativeResponse.id) {
      return {
        success: false,
        error: {
          code: 'api_error',
          message: 'Creative creation failed',
          userMessage: 'Failed to create ad creative. Please try again.',
          recoverable: true,
          suggestedAction: 'Retry publishing',
          timestamp: new Date().toISOString()
        }
      }
    }

    // ====================================================================
    // STEP 9: GET OR CREATE CAMPAIGN & ADSET
    // ====================================================================
    // Check if campaign already has Meta campaign and adset
    const { data: publishedCampaign } = await supabaseServer
      .from('meta_published_campaigns')
      .select('meta_campaign_id, meta_adset_id')
      .eq('campaign_id', params.campaignId)
      .single()

    let metaCampaignId: string
    let metaAdSetId: string

    if (publishedCampaign?.meta_campaign_id && publishedCampaign?.meta_adset_id) {
      // Use existing campaign and adset
      metaCampaignId = publishedCampaign.meta_campaign_id
      metaAdSetId = publishedCampaign.meta_adset_id
      console.log('[PublishSingleAd] Using existing Meta campaign and adset', { metaCampaignId, metaAdSetId })
    } else {
      // Create new campaign and adset
      console.log('[PublishSingleAd] Creating new Meta campaign')
      
      const campaignPayload = {
        name: campaign.name,
        objective: goal === 'leads' ? 'OUTCOME_LEADS' : goal === 'calls' ? 'OUTCOME_ENGAGEMENT' : 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: []
      }

      const campaignResponse = await apiClient.createCampaign(
        connection.selected_ad_account_id!,
        campaignPayload
      )

      if (!campaignResponse.id) {
        return {
          success: false,
          error: {
            code: 'api_error',
            message: 'Campaign creation failed',
            userMessage: 'Failed to create Meta campaign. Please try again.',
            recoverable: true,
            suggestedAction: 'Retry publishing',
            timestamp: new Date().toISOString()
          }
        }
      }

      metaCampaignId = campaignResponse.id

      // Create adset
      console.log('[PublishSingleAd] Creating ad set')
      
      const adsetPayload = {
        name: `${campaign.name} - AdSet`,
        campaign_id: metaCampaignId,
        billing_event: 'IMPRESSIONS',
        optimization_goal: goal === 'leads' ? 'LEAD_GENERATION' : goal === 'calls' ? 'CONVERSATIONS' : 'LINK_CLICKS',
        bid_amount: 100,
        daily_budget: (budgetData.dailyBudget || 10) * 100, // Convert to cents
        status: 'PAUSED',
        targeting: {
          geo_locations: locationData.locations && locationData.locations.length > 0
            ? {
                countries: locationData.locations
                  .filter(l => l.type === 'country')
                  .map(l => l.key)
              }
            : { countries: ['US'] }
        }
      }

      const adsetResponse = await apiClient.createAdSet(
        connection.selected_ad_account_id!,
        adsetPayload
      )

      if (!adsetResponse.id) {
        return {
          success: false,
          error: {
            code: 'api_error',
            message: 'AdSet creation failed',
            userMessage: 'Failed to create ad set. Please try again.',
            recoverable: true,
            suggestedAction: 'Retry publishing',
            timestamp: new Date().toISOString()
          }
        }
      }

      metaAdSetId = adsetResponse.id

      // Save to database
      await supabaseServer
        .from('meta_published_campaigns')
        .upsert({
          campaign_id: params.campaignId,
          meta_campaign_id: metaCampaignId,
          meta_adset_id: metaAdSetId,
          meta_ad_ids: [],
          publish_status: 'paused',
          updated_at: new Date().toISOString()
        }, { onConflict: 'campaign_id' })
    }

    // ====================================================================
    // STEP 10: CREATE AD
    // ====================================================================
    console.log('[PublishSingleAd] Creating Meta ad')
    
    const adPayload = {
      name: ad.name,
      adset_id: metaAdSetId,
      creative: { creative_id: creativeResponse.id },
      status: 'PAUSED' // Start paused, let Meta review first
    }

    const adResponse = await apiClient.createAd(
      connection.selected_ad_account_id!,
      adPayload
    )

    if (!adResponse.id) {
      return {
        success: false,
        error: {
          code: 'api_error',
          message: 'Ad creation failed',
          userMessage: 'Failed to create ad on Meta. Please try again.',
          recoverable: true,
          suggestedAction: 'Retry publishing',
          timestamp: new Date().toISOString()
        }
      }
    }

    console.log('[PublishSingleAd] Ad published successfully', { metaAdId: adResponse.id })

    // Meta will review the ad, so status is pending_review
    return {
      success: true,
      metaAdId: adResponse.id,
      status: 'pending_review'
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    console.error('[PublishSingleAd] Ad publishing failed', { error: err instanceof Error ? err.message : String(err), adId: params.adId })

    return {
      success: false,
      error: {
        code: 'api_error',
        message: err.message,
        userMessage: 'Failed to publish ad. Please try again.',
        recoverable: true,
        suggestedAction: 'Retry publishing',
        timestamp: new Date().toISOString()
      }
    }
  }
}

