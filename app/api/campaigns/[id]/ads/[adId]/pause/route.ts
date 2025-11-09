/**
 * Feature: Pause Individual Ad
 * Purpose: Pause a specific Meta ad without affecting other ads in the campaign
 * References:
 *  - Meta Ad Status Updates: https://developers.facebook.com/docs/marketing-api/reference/adgroup#Updating
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { pauseAd } from '@/lib/meta/ad-operations'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params

    console.log('[MetaPauseAd] POST request:', { campaignId, adId })

    // Verify user owns the campaign
    const { data: user } = await supabaseServer.auth.getUser()
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error('[MetaPauseAd] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Pause the ad
    const result = await pauseAd(adId, campaignId)

    return NextResponse.json({ success: true, status: result.status })
  } catch (error) {
    console.error('[MetaPauseAd] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to pause ad'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

