/**
 * Feature: Publish Individual Ad
 * Purpose: Publish a specific ad from draft to active status with Meta integration
 * References:
 *  - Meta Ad Creation: https://developers.facebook.com/docs/marketing-api/reference/adgroup
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params

    console.log('[PublishAd] POST request:', { campaignId, adId })

    const supabase = await createServerClient()

    // Verify user owns the campaign
    const { data: user, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[PublishAd] Auth getUser error:', authError)
    }
    if (!user?.user) {
      console.warn('[PublishAd] Unauthorized request', { campaignId, adId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id, user_id, name')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error('[PublishAd] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.user.id) {
      console.warn('[PublishAd] Forbidden request', {
        campaignId,
        adId,
        requesterId: user.user.id,
        campaignOwner: campaign?.user_id,
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the ad from database
    const { data: ad, error: adError } = await supabaseServer
      .from('ads')
      .select('*')
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .single()

    if (adError || !ad) {
      console.error('[PublishAd] Failed to fetch ad:', adError)
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    // Validate that ad is in draft or rejected status (can republish rejected ads)
    if (ad.status !== 'draft' && ad.status !== 'rejected') {
      console.warn('[PublishAd] Ad cannot be published:', { adId, status: ad.status })
      return NextResponse.json({ 
        error: ad.status === 'pending_approval' 
          ? 'Ad is already under review' 
          : 'Only draft or rejected ads can be published' 
      }, { status: 400 })
    }

    // Validate ad has required data (creative_data and copy_data)
    if (!ad.creative_data || !ad.copy_data) {
      console.warn('[PublishAd] Ad is missing required data:', { adId, hasCreative: !!ad.creative_data, hasCopy: !!ad.copy_data })
      return NextResponse.json({ error: 'Ad setup is incomplete' }, { status: 400 })
    }

    // TODO: Integrate with Meta API to actually submit the ad
    // For now, we'll update status to pending_approval
    // When Meta integration is ready:
    // 1. Submit ad to Meta API
    // 2. Get Meta Ad ID
    // 3. Set status to pending_approval
    // 4. Meta webhook will update to 'active' when approved

    // Update ad status to pending_approval (submitted for review)
    const { data: updatedAd, error: updateError } = await supabaseServer
      .from('ads')
      .update({
        status: 'pending_approval',
        meta_review_status: 'pending',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Clear rejection timestamp if resubmitting
        rejected_at: null,
      })
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('[PublishAd] Failed to update ad status:', updateError)
      return NextResponse.json({ error: 'Failed to publish ad' }, { status: 500 })
    }

    console.log('[PublishAd] Ad submitted for review:', { adId, campaignId, status: 'pending_approval' })

    return NextResponse.json({
      success: true,
      ad: updatedAd,
      status: 'pending_approval',
      publishedAt: updatedAd.published_at,
      message: 'Ad submitted for review'
    })
  } catch (error) {
    console.error('[PublishAd] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to publish ad'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

