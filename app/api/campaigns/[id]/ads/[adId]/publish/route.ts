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

    // Validate that ad is in draft status
    if (ad.status !== 'draft') {
      console.warn('[PublishAd] Ad is not in draft status:', { adId, status: ad.status })
      return NextResponse.json({ error: 'Only draft ads can be published' }, { status: 400 })
    }

    // Validate ad has required data
    const setupSnapshot = ad.setup_snapshot as Record<string, unknown> | null
    if (!setupSnapshot) {
      return NextResponse.json({ error: 'Ad setup is incomplete' }, { status: 400 })
    }

    // TODO: Integrate with Meta API to actually publish the ad
    // For now, we'll just update the status in our database
    // When Meta integration is ready, we'll create the ad in Meta and get a meta_ad_id

    // Update ad status to active
    const { data: updatedAd, error: updateError } = await supabaseServer
      .from('ads')
      .update({
        status: 'active',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('[PublishAd] Failed to update ad status:', updateError)
      return NextResponse.json({ error: 'Failed to publish ad' }, { status: 500 })
    }

    console.log('[PublishAd] Ad published successfully:', { adId, campaignId })

    return NextResponse.json({
      success: true,
      ad: updatedAd,
      publishedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[PublishAd] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to publish ad'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

