/**
 * Feature: Pre-Publish Validator
 * Purpose: Validate campaign data before attempting to publish to Meta
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api
 */

import { supabaseServer } from '@/lib/supabase/server'
import type { PublishError } from '@/lib/types/workspace'
import { TargetingTransformer } from '@/lib/meta/payload-transformation/targeting-transformer'

interface ValidationResult {
  valid: boolean
  errors: PublishError[]
}

interface PrePublishValidationParams {
  campaignId: string
  adId: string
  userId: string
}

/**
 * Validates all requirements before publishing an ad to Meta
 */
export async function validatePrePublish(params: PrePublishValidationParams): Promise<ValidationResult> {
  const errors: PublishError[] = []

  console.log('[PrePublishValidator] 🔍 Starting pre-publish validation...')
  console.log('[PrePublishValidator] Campaign ID:', params.campaignId)
  console.log('[PrePublishValidator] Ad ID:', params.adId)

  // Validate Campaign ID is a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(params.campaignId)) {
    console.error('[PrePublishValidator] ❌ Invalid campaign ID format')
    errors.push({
      code: 'validation_error',
      message: 'Invalid campaign ID format',
      userMessage: 'Campaign ID is not valid. Please try creating a new campaign.',
      recoverable: false,
      timestamp: new Date().toISOString()
    })
    return { valid: false, errors }
  }

  if (!uuidRegex.test(params.adId)) {
    console.error('[PrePublishValidator] ❌ Invalid ad ID format')
    errors.push({
      code: 'validation_error',
      message: 'Invalid ad ID format',
      userMessage: 'Ad ID is not valid. Please try creating a new ad.',
      recoverable: false,
      timestamp: new Date().toISOString()
    })
    return { valid: false, errors }
  }

  // Load campaign data (campaign_states table removed)
  const { data: campaign, error: campaignError } = await supabaseServer
    .from('campaigns')
    .select('*')
    .eq('id', params.campaignId)
    .single()

  if (campaignError || !campaign) {
    console.error('[PrePublishValidator] ❌ Campaign not found')
    errors.push({
      code: 'validation_error',
      message: 'Campaign not found',
      userMessage: 'The campaign could not be found. Please refresh the page and try again.',
      recoverable: true,
      suggestedAction: 'Refresh the page',
      timestamp: new Date().toISOString()
    })
    return { valid: false, errors }
  }

  console.log('[PrePublishValidator] ✅ Campaign found:', campaign.name)

  // Verify campaign ownership
  if (campaign.user_id !== params.userId) {
    console.error('[PrePublishValidator] ❌ Campaign ownership mismatch')
    errors.push({
      code: 'validation_error',
      message: 'Campaign ownership mismatch',
      userMessage: 'You do not have permission to publish this campaign.',
      recoverable: false,
      timestamp: new Date().toISOString()
    })
    return { valid: false, errors }
  }

  // Load ad data
  const { data: ad, error: adError } = await supabaseServer
    .from('ads')
    .select(`
      *,
      ad_copy_variations(*),
      ad_creatives(*),
      ad_target_locations(*),
      ad_destinations(*)
    `)
    .eq('id', params.adId)
    .eq('campaign_id', params.campaignId)
    .single()

  if (adError || !ad) {
    console.error('[PrePublishValidator] ❌ Ad not found')
    errors.push({
      code: 'validation_error',
      message: 'Ad not found',
      userMessage: 'The ad could not be found. Please refresh the page and try again.',
      recoverable: true,
      suggestedAction: 'Refresh the page',
      timestamp: new Date().toISOString()
    })
    return { valid: false, errors }
  }

  console.log('[PrePublishValidator] ✅ Ad found:', ad.name)

  // Check Meta connection
  const { data: connection, error: connectionError } = await supabaseServer
    .from('campaign_meta_connections')
    .select('*')
    .eq('campaign_id', params.campaignId)
    .maybeSingle()

  if (connectionError) {
    console.error('[PrePublishValidator] ❌ Error checking Meta connection:', connectionError)
    errors.push({
      code: 'api_error',
      message: 'Failed to check Meta connection',
      userMessage: 'Could not verify your Meta connection. Please try again.',
      recoverable: true,
      suggestedAction: 'Retry publishing',
      timestamp: new Date().toISOString()
    })
  }

  if (!connection) {
    console.error('[PrePublishValidator] ❌ No Meta connection found')
    errors.push({
      code: 'token_expired',
      message: 'No Meta connection found',
      userMessage: 'You need to connect your Facebook account before publishing.',
      recoverable: true,
      suggestedAction: 'Click "Connect Meta" to connect your Facebook account',
      timestamp: new Date().toISOString()
    })
  } else {
    console.log('[PrePublishValidator] ✅ Meta connection found')

    // Validate token exists
    if (!connection.long_lived_user_token) {
      console.error('[PrePublishValidator] ❌ Meta token missing')
      errors.push({
        code: 'token_expired',
        message: 'Meta access token is missing',
        userMessage: 'Your Facebook connection token is missing. Please reconnect your account.',
        recoverable: true,
        suggestedAction: 'Reconnect your Facebook account',
        timestamp: new Date().toISOString()
      })
    }

    // Validate ad account selected
    if (!connection.selected_ad_account_id) {
      console.error('[PrePublishValidator] ❌ No ad account selected')
      errors.push({
        code: 'validation_error',
        message: 'No ad account selected',
        userMessage: 'You need to select an ad account before publishing.',
        recoverable: true,
        suggestedAction: 'Open Campaign Settings and select an ad account',
        timestamp: new Date().toISOString()
      })
    } else {
      console.log('[PrePublishValidator] ✅ Ad account selected:', connection.selected_ad_account_id)
    }

    // Validate page selected (required for most ad types)
    if (!connection.selected_page_id) {
      console.warn('[PrePublishValidator] ⚠️  No page selected (may be required for ad type)')
    } else {
      console.log('[PrePublishValidator] ✅ Page selected:', connection.selected_page_id)
    }
  }

  // Check campaign goal (from normalized schema)
  const goal = campaign.initial_goal

  if (!goal) {
    console.error('[PrePublishValidator] ❌ Campaign goal not set')
    errors.push({
      code: 'validation_error',
      message: 'Campaign goal not set',
      userMessage: 'You need to set a campaign goal before publishing.',
      recoverable: true,
      suggestedAction: 'Complete the Goal step in campaign setup',
      timestamp: new Date().toISOString()
    })
  } else {
    console.log('[PrePublishValidator] ✅ Campaign goal set:', goal)
  }

  // Check budget (from normalized schema)
  const budgetCents = campaign.campaign_budget_cents
  const dailyBudget = budgetCents ? budgetCents / 100 : undefined

  if (!dailyBudget || dailyBudget < 1) {
    console.error('[PrePublishValidator] ❌ Invalid budget:', dailyBudget)
    errors.push({
      code: 'validation_error',
      message: 'Invalid or missing daily budget',
      userMessage: 'You need to set a daily budget of at least $1 before publishing.',
      recoverable: true,
      suggestedAction: 'Set your daily budget in Campaign Settings',
      timestamp: new Date().toISOString()
    })
  } else {
    console.log('[PrePublishValidator] ✅ Budget set:', `$${dailyBudget}/day`)
  }

  // Check ad creative from normalized tables
  const copyVariations = ad.ad_copy_variations as unknown as Array<{
    headline?: string
    primary_text?: string
    description?: string
    is_selected?: boolean
  }> | undefined
  
  const creatives = ad.ad_creatives as unknown as Array<{
    image_url?: string
    is_selected?: boolean
  }> | undefined

  const copy = copyVariations?.find(c => c.is_selected) || copyVariations?.[0] || {}
  const creative = creatives?.find(c => c.is_selected) || creatives?.[0] || {}

  // Validate image exists
  const imageUrl = creative.image_url

  if (!imageUrl) {
    console.error('[PrePublishValidator] ❌ No image found')
    errors.push({
      code: 'validation_error',
      message: 'No image found for ad',
      userMessage: 'Your ad needs an image before publishing.',
      recoverable: true,
      suggestedAction: 'Add an image to your ad',
      timestamp: new Date().toISOString()
    })
  } else {
    console.log('[PrePublishValidator] ✅ Image found:', imageUrl.substring(0, 50) + '...')

    // Validate image URL format
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('/')) {
      console.error('[PrePublishValidator] ❌ Invalid image URL format')
      errors.push({
        code: 'validation_error',
        message: 'Invalid image URL format',
        userMessage: 'The image URL is not valid. Please re-generate or upload a new image.',
        recoverable: true,
        suggestedAction: 'Generate or upload a new image',
        timestamp: new Date().toISOString()
      })
    }
  }

  // Validate copy exists
  if (!copy.headline && !copy.primary_text) {
    console.error('[PrePublishValidator] ❌ No ad copy found')
    errors.push({
      code: 'validation_error',
      message: 'No ad copy found',
      userMessage: 'Your ad needs headline and primary text before publishing.',
      recoverable: true,
      suggestedAction: 'Add headline and text to your ad',
      timestamp: new Date().toISOString()
    })
  } else {
    console.log('[PrePublishValidator] ✅ Ad copy found')
  }

  // Validate destination (required for publish) - load from ad_destinations table (one-to-one)
  const adDestinations = ad.ad_destinations as {
    destination_type?: string
    website_url?: string
    instant_form_id?: string
    phone_number?: string
  } | null | undefined
  const destination = {
    type: adDestinations?.destination_type,
    data: {
      formId: adDestinations?.instant_form_id,
      websiteUrl: adDestinations?.website_url,
      phoneNumber: adDestinations?.phone_number
    }
  }
  
  if (!destination?.type) {
    console.error('[PrePublishValidator] ❌ No destination configured')
    errors.push({
      code: 'validation_error',
      message: 'No destination configured',
      userMessage: 'You need to configure an ad destination (form, URL, or phone) before publishing.',
      recoverable: true,
      suggestedAction: 'Complete the Destination step in ad setup',
      timestamp: new Date().toISOString()
    })
  } else {
    console.log('[PrePublishValidator] ✅ Destination configured:', destination.type)
    
    // Validate destination data based on type
    if (destination.type === 'instant_form' && !destination.data?.formId) {
      console.error('[PrePublishValidator] ❌ Lead form not selected')
      errors.push({
        code: 'validation_error',
        message: 'Lead form not configured',
        userMessage: 'You need to select or create a lead form before publishing.',
        recoverable: true,
        suggestedAction: 'Select a lead form in the Destination step',
        timestamp: new Date().toISOString()
      })
    } else if (destination.type === 'website_url' && !destination.data?.websiteUrl) {
      console.error('[PrePublishValidator] ❌ Website URL not configured')
      errors.push({
        code: 'validation_error',
        message: 'Website URL not configured',
        userMessage: 'You need to enter a website URL before publishing.',
        recoverable: true,
        suggestedAction: 'Enter your website URL in the Destination step',
        timestamp: new Date().toISOString()
      })
    } else if (destination.type === 'phone_number' && !destination.data?.phoneNumber) {
      console.error('[PrePublishValidator] ❌ Phone number not configured')
      errors.push({
        code: 'validation_error',
        message: 'Phone number not configured',
        userMessage: 'You need to enter a phone number before publishing.',
        recoverable: true,
        suggestedAction: 'Enter your phone number in the Destination step',
        timestamp: new Date().toISOString()
      })
    }
  }

  // Validate location targeting from ad_target_locations table
  const targetLocations = ad.ad_target_locations as Array<{
    location_key?: string
    location_name: string
    location_type: string
  }> | undefined
  
  if (!targetLocations || targetLocations.length === 0) {
    console.warn('[PrePublishValidator] ⚠️ No location targeting set (will default to US)')
    // Note: This is a warning, not blocking - ad can still publish with default targeting
  } else {
    console.log('[PrePublishValidator] ✅ Location targeting set:', targetLocations.length, 'locations')
    
    // Validate Meta keys are present
    const locationData = {
      locations: targetLocations.map(loc => ({
        key: loc.location_key || loc.location_name,
        name: loc.location_name,
        type: loc.location_type
      }))
    }
    const transformer = new TargetingTransformer()
    const metaKeyValidation = transformer.validateMetaKeys(locationData)
    
    if (!metaKeyValidation.isValid) {
      console.error('[PrePublishValidator] ❌ Location Meta keys missing:', metaKeyValidation.errors)
      errors.push({
        code: 'validation_error',
        message: 'Location Meta keys missing',
        userMessage: metaKeyValidation.errors.join('. ') + '. This will cause publishing to fail.',
        recoverable: false,
        suggestedAction: 'Re-set your locations to fetch Meta keys',
        timestamp: new Date().toISOString()
      })
    } else {
      console.log('[PrePublishValidator] ✅ All locations have Meta keys')
    }
  }

  // Summary
  const isValid = errors.length === 0
  if (isValid) {
    console.log('[PrePublishValidator] ========================================')
    console.log('[PrePublishValidator] ✅ PRE-PUBLISH VALIDATION PASSED')
    console.log('[PrePublishValidator] ========================================')
  } else {
    console.error('[PrePublishValidator] ========================================')
    console.error('[PrePublishValidator] ❌ PRE-PUBLISH VALIDATION FAILED')
    console.error('[PrePublishValidator] Errors:', errors.length)
    errors.forEach((err, idx) => {
      console.error(`[PrePublishValidator] ${idx + 1}. ${err.code}: ${err.userMessage}`)
    })
    console.error('[PrePublishValidator] ========================================')
  }

  return { valid: isValid, errors }
}

