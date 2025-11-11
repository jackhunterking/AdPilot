/**
 * Feature: Reject Ad (Dev/Admin Endpoint)
 * Purpose: Manually reject a pending ad (simulates Meta rejection until API integration)
 * References:
 *  - Meta Ad Rejection: https://www.facebook.com/business/help/247189082393271
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 *  - Supabase Types: https://supabase.com/docs/guides/api/rest/generating-types
 * 
 * NOTE: This endpoint simulates Meta's rejection process for testing.
 * In production, this will be triggered by Meta's webhook when an ad is rejected.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

// Type guard to check if a value is a JSON object
function isJsonObject(value: Json): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params

    console.log('[RejectAd] POST request:', { campaignId, adId })

    const supabase = await createServerClient()

    // Get rejection reason from request body (optional)
    let rejectionReason = 'Ad does not comply with Meta advertising policies'
    try {
      const body = await request.json()
      if (body.reason && typeof body.reason === 'string') {
        rejectionReason = body.reason
      }
    } catch {
      // No body or invalid JSON - use default reason
    }

    // Verify user owns the campaign
    const { data: user, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[RejectAd] Auth getUser error:', authError)
    }
    if (!user?.user) {
      console.warn('[RejectAd] Unauthorized request', { campaignId, adId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id, user_id, name')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error('[RejectAd] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.user.id) {
      console.warn('[RejectAd] Forbidden request', {
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
      console.error('[RejectAd] Failed to fetch ad:', adError)
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    // Validate that ad is in pending_approval status
    if (ad.status !== 'pending_approval') {
      console.warn('[RejectAd] Ad is not pending approval:', { adId, status: ad.status })
      return NextResponse.json({ 
        error: `Cannot reject ad with status '${ad.status}'. Only pending_approval ads can be rejected.` 
      }, { status: 400 })
    }

    // Store rejection reason in metrics_snapshot for now (can add dedicated column later)
    // Safely spread metrics_snapshot only if it's a JSON object
    const baseSnapshot = ad.metrics_snapshot && isJsonObject(ad.metrics_snapshot) 
      ? ad.metrics_snapshot 
      : {}
    
    const rejectionData: Record<string, Json> = {
      ...baseSnapshot,
      rejection_reason: rejectionReason,
      rejected_by: 'system', // In production, this would be 'meta'
    }

    // Update ad status to rejected
    const { data: updatedAd, error: updateError } = await supabaseServer
      .from('ads')
      .update({
        status: 'rejected',
        meta_review_status: 'rejected',
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metrics_snapshot: rejectionData,
      })
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('[RejectAd] Failed to update ad status:', updateError)
      return NextResponse.json({ error: 'Failed to reject ad' }, { status: 500 })
    }

    console.log('[RejectAd] Ad rejected:', { adId, campaignId, reason: rejectionReason })

    return NextResponse.json({
      success: true,
      ad: updatedAd,
      status: 'rejected',
      rejectedAt: updatedAd.rejected_at,
      reason: rejectionReason,
      message: 'Ad rejected - changes needed'
    })
  } catch (error) {
    console.error('[RejectAd] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to reject ad'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

