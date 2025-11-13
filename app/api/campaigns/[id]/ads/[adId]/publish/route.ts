/**
 * Feature: Individual Ad Publishing API
 * Purpose: Publish a single ad to Meta with proper status tracking and error handling
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/reference/ad/
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { publishSingleAd } from '@/lib/meta/publisher-single-ad'
import { validatePrePublish } from '@/lib/meta/publishing/pre-publish-validator'
import type { AdStatus } from '@/lib/types/workspace'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await params
    
    console.log('[Publish API] ========================================')
    console.log('[Publish API] 📥 Received publish request')
    console.log('[Publish API] Campaign ID:', campaignId)
    console.log('[Publish API] Ad ID:', adId)
    console.log('[Publish API] URL:', req.url)
    console.log('[Publish API] ========================================')
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Publish API] ❌ Authentication failed:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Publish API] ✅ User authenticated:', user.id)

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id, user_id, name')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('[Publish API] ❌ Campaign not found:', {
        campaignId,
        error: campaignError?.message
      })
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.user_id !== user.id) {
      console.error('[Publish API] ❌ Campaign ownership mismatch:', {
        campaignId,
        campaignUserId: campaign.user_id,
        requestUserId: user.id
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('[Publish API] ✅ Campaign ownership verified:', campaign.name)

    // Verify ad belongs to campaign
    const { data: ad, error: adError } = await supabaseServer
      .from('ads')
      .select('id, campaign_id, status, meta_ad_id, name')
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .single()

    if (adError || !ad) {
      console.error('[Publish API] ❌ Ad not found:', {
        adId,
        campaignId,
        error: adError?.message
      })
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    console.log('[Publish API] ✅ Ad found:', {
      name: ad.name,
      status: ad.status,
      alreadyPublished: !!ad.meta_ad_id
    })

    // Check if already published
    if (ad.meta_ad_id) {
      console.warn('[Publish API] ⚠️  Ad already published:', {
        adId,
        metaAdId: ad.meta_ad_id,
        currentStatus: ad.status
      })
      return NextResponse.json(
        { 
          error: 'Ad already published',
          meta_ad_id: ad.meta_ad_id,
          current_status: ad.status
        },
        { status: 409 }
      )
    }

    // Update status to pending_review immediately
    console.log('[Publish API] 📝 Updating ad status to pending_review...')
    const { error: updateError } = await supabaseServer
      .from('ads')
      .update({ 
        status: 'pending_review' as AdStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', adId)

    if (updateError) {
      console.error('[Publish API] ❌ Failed to update ad status:', updateError)
    } else {
      console.log('[Publish API] ✅ Ad status updated to pending_review')
    }

    // PRE-FLIGHT VALIDATION: Check all requirements before publishing
    console.log('[Publish API] 🔍 Running pre-flight validation...')
    const validation = await validatePrePublish({
      campaignId,
      adId,
      userId: user.id
    })

    if (!validation.valid) {
      console.error('[Publish API] ❌ Pre-flight validation failed')
      
      // Revert status back to draft
      await supabaseServer
        .from('ads')
        .update({ 
          status: 'draft' as AdStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

      // Return first validation error
      const firstError = validation.errors[0]
      return NextResponse.json({
        success: false,
        error: firstError,
        status: 'failed',
        validationErrors: validation.errors
      }, { status: 400 })
    }

    console.log('[Publish API] ✅ Pre-flight validation passed')

    // Publish to Meta (async operation)
    console.log('[Publish API] 🚀 Calling publishSingleAd...')
    try {
      const result = await publishSingleAd({
        campaignId,
        adId,
        userId: user.id
      })
      
      console.log('[Publish API] 📊 Publish result:', {
        success: result.success,
        metaAdId: result.metaAdId,
        status: result.status,
        hasError: !!result.error
      })

      if (!result.success) {
        console.error('[Publish API] ❌ Publishing failed:', result.error)
        
        // Update status to failed
        await supabaseServer
          .from('ads')
          .update({ 
            status: 'failed' as AdStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', adId)

        console.log('[Publish API] Ad status updated to failed')
        
        return NextResponse.json({
          success: false,
          error: result.error,
          status: 'failed'
        }, { status: 500 })
      }

      // Success - update with Meta ad ID
      console.log('[Publish API] ✅ Publishing succeeded, updating database...')
      const { error: successUpdateError } = await supabaseServer
        .from('ads')
        .update({
          meta_ad_id: result.metaAdId,
          status: result.status as AdStatus,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

      if (successUpdateError) {
        console.error('[Publish API] ⚠️  Failed to update ad with Meta ID:', successUpdateError)
      } else {
        console.log('[Publish API] ✅ Ad updated with Meta ID:', result.metaAdId)
      }

      console.log('[Publish API] ========================================')
      console.log('[Publish API] ✅ Publish complete!')
      console.log('[Publish API] ========================================')

      return NextResponse.json({
        success: true,
        meta_ad_id: result.metaAdId,
        status: result.status,
        message: 'Ad published successfully'
      })

    } catch (publishError) {
      // Handle publishing errors
      const error = publishError instanceof Error ? publishError : new Error('Unknown error')
      
      console.error('[Publish API] ❌ Exception during publishing:', {
        message: error.message,
        stack: error.stack
      })
      
      await supabaseServer
        .from('ads')
        .update({ 
          status: 'failed' as AdStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

      return NextResponse.json({
        success: false,
        error: {
          code: 'api_error',
          message: error.message,
          userMessage: 'Failed to publish ad. Please try again.'
        },
        status: 'failed'
      }, { status: 500 })
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    console.error('[Publish API] ========================================')
    console.error('[Publish API] ❌ Unexpected error')
    console.error('[Publish API] Error:', err.message)
    console.error('[Publish API] Stack:', err.stack)
    console.error('[Publish API] ========================================')
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check publish status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await params
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get ad with metadata
    const { data: ad } = await supabaseServer
      .from('ads')
      .select(`
        id,
        status,
        meta_ad_id,
        published_at,
        approved_at,
        rejected_at
      `)
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .single()

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    return NextResponse.json({
      ad_id: ad.id,
      status: ad.status,
      meta_ad_id: ad.meta_ad_id,
      published_at: ad.published_at,
      approved_at: ad.approved_at,
      rejected_at: ad.rejected_at
    })

  } catch (error) {
    console.error('[Publish Status API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

