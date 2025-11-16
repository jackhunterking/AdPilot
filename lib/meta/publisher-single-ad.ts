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
    console.log('[PublishSingleAd] ========================================')
    console.log('[PublishSingleAd] 🚀 Starting single ad publish')
    console.log('[PublishSingleAd] Campaign:', params.campaignId)
    console.log('[PublishSingleAd] Ad ID:', params.adId)
    console.log('[PublishSingleAd] User ID:', params.userId)
    console.log('[PublishSingleAd] ========================================')

    // ====================================================================
    // STEP 1: LOAD AD DATA
    // ====================================================================
    console.log('[PublishSingleAd] 📦 STEP 1: Loading ad data...')
    const { data: ad, error: adError } = await supabaseServer
      .from('ads')
      .select(`
        id,
        campaign_id,
        name,
        status,
        ad_copy_variations(*),
        ad_creatives(*),
        ad_destinations(*),
        ad_target_locations(*)
      `)
      .eq('id', params.adId)
      .single()

    if (adError || !ad) {
      console.error('[PublishSingleAd] ❌ Failed to load ad:', {
        adId: params.adId,
        error: adError?.message,
        code: adError?.code
      })
      throw new Error(adError?.message || 'Ad not found')
    }

    console.log('[PublishSingleAd] ✅ Ad loaded:', {
      id: ad.id,
      name: ad.name,
      status: ad.status,
      hasCopyVariations: !!(ad.ad_copy_variations as Array<unknown>)?.length,
      hasCreatives: !!(ad.ad_creatives as Array<unknown>)?.length,
      hasDestination: !!(ad.ad_destinations as Record<string, unknown> | null),
      hasTargetLocations: !!(ad.ad_target_locations as Array<unknown>)?.length
    })

    // ====================================================================
    // STEP 2: LOAD CAMPAIGN DATA
    // ====================================================================
    console.log('[PublishSingleAd] 📦 STEP 2: Loading campaign data...')
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('*')
      .eq('id', params.campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('[PublishSingleAd] ❌ Failed to load campaign:', {
        campaignId: params.campaignId,
        error: campaignError?.message,
        code: campaignError?.code
      })
      throw new Error(campaignError?.message || 'Campaign not found')
    }

    console.log('[PublishSingleAd] ✅ Campaign loaded:', {
      id: campaign.id,
      name: campaign.name,
      initialGoal: campaign.initial_goal
    })

    // ====================================================================
    // STEP 3: LOAD META CONNECTION
    // ====================================================================
    console.log('[PublishSingleAd] 🔐 STEP 3: Loading Meta connection...')
    const connection = await getConnectionWithToken({ campaignId: params.campaignId })

    if (!connection) {
      console.error('[PublishSingleAd] ❌ No Meta connection found for campaign:', params.campaignId)
      return {
        success: false,
        error: {
          code: 'token_expired',
          message: 'Meta connection not found in database',
          userMessage: 'Please reconnect your Facebook account to continue',
          recoverable: true,
          suggestedAction: 'Click "Connect Meta" to reconnect your account',
          timestamp: new Date().toISOString()
        }
      }
    }

    if (!connection.long_lived_user_token) {
      console.error('[PublishSingleAd] ❌ Meta connection found but token is missing:', {
        campaignId: params.campaignId,
        hasConnection: true,
        hasToken: false,
        adAccountId: connection.selected_ad_account_id,
        pageId: connection.selected_page_id
      })
      return {
        success: false,
        error: {
          code: 'token_expired',
          message: 'Meta access token is missing or expired',
          userMessage: 'Your Facebook connection has expired. Please reconnect your account',
          recoverable: true,
          suggestedAction: 'Click "Connect Meta" to refresh your connection',
          timestamp: new Date().toISOString()
        }
      }
    }

    console.log('[PublishSingleAd] ✅ Meta connection validated:', {
      hasToken: true,
      hasAdAccount: !!connection.selected_ad_account_id,
      adAccountId: connection.selected_ad_account_id,
      hasPage: !!connection.selected_page_id,
      pageId: connection.selected_page_id,
      paymentConnected: connection.ad_account_payment_connected
    })

    // ====================================================================
    // STEP 4: EXTRACT AD DATA FROM NORMALIZED TABLES
    // ====================================================================
    // Data now comes from normalized tables instead of JSON columns
    const copyVariations = ad.ad_copy_variations as Array<{
      headline?: string
      primary_text?: string
      description?: string
      cta_text?: string
      is_selected?: boolean
    }> | undefined
    
    const creatives = ad.ad_creatives as Array<{
      image_url?: string
      format?: string
      is_selected?: boolean
    }> | undefined
    
    // Get selected copy variation (or first one)
    const copy = copyVariations?.find(c => c.is_selected) || copyVariations?.[0] || {}
    
    // Get selected creative (or first one)  
    const creative = creatives?.find(c => c.is_selected) || creatives?.[0] || {}
    
    const imageUrl = creative.image_url

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
    // STEP 5: GET CAMPAIGN CONFIG FROM NORMALIZED SCHEMA
    // ====================================================================
    // Campaign config now comes from campaigns table and metadata (campaign_states removed)
    const metadata = campaign.metadata as {
      formData?: {
        id?: string
        websiteUrl?: string
        phoneNumber?: string
      }
    } | null

    const goalData = {
      selectedGoal: campaign.initial_goal as GoalType | undefined,
      formData: metadata?.formData
    }
    
    const budgetData = {
      dailyBudget: campaign.campaign_budget_cents ? campaign.campaign_budget_cents / 100 : undefined,
      selectedAdAccount: undefined // Not stored in campaign
    }
    
    // Load location data from ad_target_locations table  
    const adTargetLocations = ad.ad_target_locations as Array<{
      location_key?: string
      location_name: string
      location_type: string
    }> | undefined
    
    const locationData = {
      locations: adTargetLocations?.map(loc => ({
        key: loc.location_key || loc.location_name,
        name: loc.location_name,
        type: loc.location_type,
        mode: 'include'
      })) || []
    }

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
    console.log('[PublishSingleAd] 📤 STEP 7: Uploading image to Meta...', { imageUrl })
    
    const imageUploadResult = await imageUploader.uploadImagesWithRetry(
      [imageUrl],
      'feed',
      1,
      2
    )

    if (imageUploadResult.failed.size > 0) {
      const failedImage = Array.from(imageUploadResult.failed.keys())[0]
      const failureReason = imageUploadResult.failed.get(failedImage || '')
      console.error('[PublishSingleAd] ❌ Image upload failed:', {
        imageUrl,
        failedImage,
        reason: failureReason
      })
      return {
        success: false,
        error: {
          code: 'api_error',
          message: `Image upload failed: ${failureReason || 'Unknown error'}`,
          userMessage: 'Failed to upload image to Meta. Please try again.',
          recoverable: true,
          suggestedAction: 'Retry publishing',
          timestamp: new Date().toISOString()
        }
      }
    }

    const imageHash = imageUploader.getImageHashMapping(imageUploadResult).get(imageUrl)
    console.log('[PublishSingleAd] ✅ Image uploaded successfully:', {
      imageUrl,
      imageHash: imageHash ? imageHash.substring(0, 10) + '...' : 'none'
    })

    // ====================================================================
    // STEP 8: CREATE CREATIVE
    // ====================================================================
    console.log('[PublishSingleAd] 🎨 STEP 8: Creating ad creative...')
    
    const creativeGenerator = new CreativePayloadGenerator()
    const creativeResult = creativeGenerator.generate({
      pageId: connection.selected_page_id!,
      instagramActorId: connection.selected_ig_user_id,
      goal,
      destinationType,
      destinationUrl,
      leadFormId,
      phoneNumber,
      primaryText: copy.primary_text || '',
      headline: copy.headline || '',
      description: copy.description || '',
      imageHash,
      variationIndex: 0
    })

    console.log('[PublishSingleAd] Creative payload generated:', {
      pageId: connection.selected_page_id,
      hasInstagram: !!connection.selected_ig_user_id,
      destinationType,
      hasImageHash: !!imageHash,
      hasLeadForm: !!leadFormId,
      payloadKeys: Object.keys(creativeResult.payload)
    })

    const creativeResponse = await apiClient.createAdCreative(
      connection.selected_ad_account_id!,
      creativeResult.payload as unknown as Record<string, unknown>
    )

    if (!creativeResponse.id) {
      console.error('[PublishSingleAd] ❌ Creative creation failed:', creativeResponse)
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

    console.log('[PublishSingleAd] ✅ Creative created:', {
      creativeId: creativeResponse.id
    })

    // ====================================================================
    // STEP 9: GET OR CREATE CAMPAIGN & ADSET
    // ====================================================================
    console.log('[PublishSingleAd] 📋 STEP 9: Get or create Meta campaign and adset...')
    
    // Check if campaign already has Meta campaign and adset
    const { data: publishedCampaign, error: publishedError } = await supabaseServer
      .from('meta_published_campaigns')
      .select('meta_campaign_id, meta_adset_id')
      .eq('campaign_id', params.campaignId)
      .single()

    if (publishedError && publishedError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine (will create new)
      console.error('[PublishSingleAd] ❌ Error checking for existing published campaign:', publishedError)
    }

    let metaCampaignId: string
    let metaAdSetId: string

    if (publishedCampaign?.meta_campaign_id && publishedCampaign?.meta_adset_id) {
      // Use existing campaign and adset
      metaCampaignId = publishedCampaign.meta_campaign_id
      metaAdSetId = publishedCampaign.meta_adset_id
      console.log('[PublishSingleAd] ✅ Using existing Meta campaign and adset:', {
        metaCampaignId,
        metaAdSetId
      })
    } else {
      // Create new campaign and adset
      console.log('[PublishSingleAd] 🆕 Creating new Meta campaign and adset...')
      
      const campaignPayload = {
        name: campaign.name,
        objective: goal === 'leads' ? 'OUTCOME_LEADS' : goal === 'calls' ? 'OUTCOME_ENGAGEMENT' : 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: []
      }

      console.log('[PublishSingleAd] Campaign payload:', {
        name: campaignPayload.name,
        objective: campaignPayload.objective,
        adAccountId: connection.selected_ad_account_id
      })

      const campaignResponse = await apiClient.createCampaign(
        connection.selected_ad_account_id!,
        campaignPayload
      )

      if (!campaignResponse.id) {
        console.error('[PublishSingleAd] ❌ Campaign creation failed:', campaignResponse)
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
      console.log('[PublishSingleAd] ✅ Meta campaign created:', { metaCampaignId })

      // Create adset
      console.log('[PublishSingleAd] 🎯 Creating ad set...')
      
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
                  .filter((l: { type: string }) => l.type === 'country')
                  .map((l: { key?: string }) => l.key)
                  .filter((key): key is string => typeof key === 'string')
              }
            : { countries: ['US'] }
        }
      }

      console.log('[PublishSingleAd] AdSet payload:', {
        name: adsetPayload.name,
        campaignId: metaCampaignId,
        optimizationGoal: adsetPayload.optimization_goal,
        dailyBudget: adsetPayload.daily_budget,
        targeting: adsetPayload.targeting
      })

      const adsetResponse = await apiClient.createAdSet(
        connection.selected_ad_account_id!,
        adsetPayload
      )

      if (!adsetResponse.id) {
        console.error('[PublishSingleAd] ❌ AdSet creation failed:', adsetResponse)
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
      console.log('[PublishSingleAd] ✅ AdSet created:', { metaAdSetId })

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
    console.log('[PublishSingleAd] 🎬 STEP 10: Creating Meta ad...')
    
    const adPayload = {
      name: ad.name,
      adset_id: metaAdSetId,
      creative: { creative_id: creativeResponse.id },
      status: 'PAUSED' // Start paused, let Meta review first
    }

    console.log('[PublishSingleAd] Ad payload:', {
      name: adPayload.name,
      adsetId: metaAdSetId,
      creativeId: creativeResponse.id,
      status: adPayload.status
    })

    const adResponse = await apiClient.createAd(
      connection.selected_ad_account_id!,
      adPayload
    )

    if (!adResponse.id) {
      console.error('[PublishSingleAd] ❌ Ad creation failed:', adResponse)
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

    console.log('[PublishSingleAd] ========================================')
    console.log('[PublishSingleAd] ✅ Ad published successfully!')
    console.log('[PublishSingleAd] Meta Ad ID:', adResponse.id)
    console.log('[PublishSingleAd] Status: pending_review')
    console.log('[PublishSingleAd] ========================================')

    // Meta will review the ad, so status is pending_review
    return {
      success: true,
      metaAdId: adResponse.id,
      status: 'pending_review'
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    console.error('[PublishSingleAd] ========================================')
    console.error('[PublishSingleAd] ❌ Ad publishing failed')
    console.error('[PublishSingleAd] Error:', err.message)
    console.error('[PublishSingleAd] Stack:', err.stack)
    console.error('[PublishSingleAd] Ad ID:', params.adId)
    console.error('[PublishSingleAd] Campaign ID:', params.campaignId)
    console.error('[PublishSingleAd] ========================================')

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

