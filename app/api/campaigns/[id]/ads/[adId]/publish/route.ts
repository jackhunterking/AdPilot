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

    // Verify ad belongs to campaign
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('id, campaign_id, status, meta_ad_id')
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
          current_status: ad.status
        },
        { status: 409 }
      )
    }

    // Update status to pending_review immediately
    await supabaseServer
      .from('ads')
      .update({ 
        status: 'pending_review' as AdStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', adId)

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
            status: 'failed' as AdStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', adId)

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
          status: result.status as AdStatus,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', adId)

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

