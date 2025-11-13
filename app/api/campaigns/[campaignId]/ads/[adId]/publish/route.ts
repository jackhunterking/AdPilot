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
import type { AdStatus } from '@/lib/types/workspace'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string; adId: string }> }
) {
  try {
    const { campaignId, adId } = await params
    
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

    // Verify ad belongs to campaign
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('id, campaign_id, status, publishing_status, meta_ad_id')
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .single()

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    // Check if already published
    if (ad.meta_ad_id) {
      return NextResponse.json(
        { 
          error: 'Ad already published',
          meta_ad_id: ad.meta_ad_id,
          current_status: ad.publishing_status || ad.status
        },
        { status: 409 }
      )
    }

    // Update status to pending_review immediately
    await supabaseServer
      .from('ads')
      .update({ 
        publishing_status: 'pending_review' as AdStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', adId)

    // Create or update publishing metadata
    await supabaseServer
      .from('ad_publishing_metadata')
      .upsert({
        ad_id: adId,
        current_status: 'pending_review' as AdStatus,
        submission_timestamp: new Date().toISOString(),
        retry_count: 0,
        status_history: []
      }, { onConflict: 'ad_id' })

    // Publish to Meta (async operation)
    try {
      const result = await publishSingleAd({
        campaignId,
        adId,
        userId: user.id
      })

      if (!result.success) {
        // Update status to failed
        await supabaseServer
          .from('ads')
          .update({ 
            publishing_status: 'failed' as AdStatus,
            last_error: result.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', adId)

        // Update metadata with error
        await supabaseServer
          .from('ad_publishing_metadata')
          .update({
            current_status: 'failed' as AdStatus,
            error_code: result.error?.code,
            error_message: result.error?.message,
            error_user_message: result.error?.userMessage,
            error_details: result.error?.details,
            updated_at: new Date().toISOString()
          })
          .eq('ad_id', adId)

        return NextResponse.json({
          success: false,
          error: result.error,
          status: 'failed'
        }, { status: 500 })
      }

      // Success - update with Meta ad ID
      await supabaseServer
        .from('ads')
        .update({
          meta_ad_id: result.metaAdId,
          publishing_status: result.status as AdStatus,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

      // Update metadata
      await supabaseServer
        .from('ad_publishing_metadata')
        .update({
          meta_ad_id: result.metaAdId,
          current_status: result.status as AdStatus,
          last_status_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('ad_id', adId)

      return NextResponse.json({
        success: true,
        meta_ad_id: result.metaAdId,
        status: result.status,
        message: 'Ad published successfully'
      })

    } catch (publishError) {
      // Handle publishing errors
      const error = publishError instanceof Error ? publishError : new Error('Unknown error')
      
      await supabaseServer
        .from('ads')
        .update({ 
          publishing_status: 'failed' as AdStatus,
          last_error: {
            code: 'api_error',
            message: error.message,
            userMessage: 'Failed to publish ad. Please try again.',
            timestamp: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

      await supabaseServer
        .from('ad_publishing_metadata')
        .update({
          current_status: 'failed' as AdStatus,
          error_code: 'api_error',
          error_message: error.message,
          error_user_message: 'Failed to publish ad. Please try again.',
          updated_at: new Date().toISOString()
        })
        .eq('ad_id', adId)

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
    console.error('[Publish API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check publish status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string; adId: string }> }
) {
  try {
    const { campaignId, adId } = await params
    
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
        publishing_status,
        meta_ad_id,
        last_error,
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

    // Get publishing metadata
    const { data: metadata } = await supabaseServer
      .from('ad_publishing_metadata')
      .select('*')
      .eq('ad_id', adId)
      .single()

    return NextResponse.json({
      ad_id: ad.id,
      status: ad.publishing_status || ad.status,
      meta_ad_id: ad.meta_ad_id,
      last_error: ad.last_error,
      published_at: ad.published_at,
      approved_at: ad.approved_at,
      rejected_at: ad.rejected_at,
      metadata
    })

  } catch (error) {
    console.error('[Publish Status API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

