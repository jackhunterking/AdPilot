/**
 * Feature: Approve Ad (Dev/Admin Endpoint)
 * Purpose: Manually approve a pending ad (simulates Meta approval until API integration)
 * References:
 *  - Meta Ad Approval: https://www.facebook.com/business/help/247189082393271
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 * 
 * NOTE: This endpoint simulates Meta's approval process for testing.
 * In production, this will be triggered by Meta's webhook when an ad is approved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface AdWithApproval {
  id: string
  campaign_id: string
  name: string
  status: string
  meta_ad_id: string | null
  meta_review_status?: string
  approved_at?: string
  created_at: string
  updated_at: string
  copy_data: unknown
  creative_data: unknown
  metrics_snapshot: unknown
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params

    console.log('[ApproveAd] POST request:', { campaignId, adId })

    const supabase = await createServerClient()

    // Verify user owns the campaign
    const { data: user, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[ApproveAd] Auth getUser error:', authError)
    }
    if (!user?.user) {
      console.warn('[ApproveAd] Unauthorized request', { campaignId, adId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id, user_id, name')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error('[ApproveAd] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.user.id) {
      console.warn('[ApproveAd] Forbidden request', {
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
      console.error('[ApproveAd] Failed to fetch ad:', adError)
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    // Validate that ad is in pending_approval status
    if (ad.status !== 'pending_approval') {
      console.warn('[ApproveAd] Ad is not pending approval:', { adId, status: ad.status })
      return NextResponse.json({ 
        error: `Cannot approve ad with status '${ad.status}'. Only pending_approval ads can be approved.` 
      }, { status: 400 })
    }

    // Update ad status to active (approved)
    const { data: updatedAd, error: updateError } = await supabaseServer
      .from('ads')
      .update({
        status: 'active',
        meta_review_status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .select()
      .single() as { data: AdWithApproval | null; error: unknown }

    if (updateError) {
      console.error('[ApproveAd] Failed to update ad status:', updateError)
      return NextResponse.json({ error: 'Failed to approve ad' }, { status: 500 })
    }

    console.log('[ApproveAd] Ad approved successfully:', { adId, campaignId })

    return NextResponse.json({
      success: true,
      ad: updatedAd,
      status: 'active',
      approvedAt: updatedAd.approved_at,
      message: 'Ad approved and now live'
    })
  } catch (error) {
    console.error('[ApproveAd] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to approve ad'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

