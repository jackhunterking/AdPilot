/**
 * Feature: Pause Individual Ad
 * Purpose: Pause a specific Meta ad without affecting other ads in the campaign
 * References:
 *  - Meta Ad Status Updates: https://developers.facebook.com/docs/marketing-api/reference/adgroup#Updating
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { pauseAd, pauseAdWithToken } from '@/lib/meta/ad-operations'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params

    console.log('[MetaPauseAd] POST request:', { campaignId, adId })

    const supabase = await createServerClient()

    // Verify user owns the campaign
    const { data: user, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[MetaPauseAd] Auth getUser error:', authError)
    }
    if (!user?.user) {
      console.warn('[MetaPauseAd] Unauthorized request', { campaignId, adId })
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
      console.warn('[MetaPauseAd] Forbidden request', {
        campaignId,
        adId,
        requesterId: user.user.id,
        campaignOwner: campaign?.user_id,
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let tokenOverride: string | null = null
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        const bodyUnknown: unknown = await request.json()
        if (
          bodyUnknown &&
          typeof bodyUnknown === 'object' &&
          !Array.isArray(bodyUnknown) &&
          'token' in bodyUnknown &&
          typeof (bodyUnknown as { token: unknown }).token === 'string'
        ) {
          tokenOverride = (bodyUnknown as { token: string }).token.trim() || null
        }
      } catch (parseError) {
        console.warn('[MetaPauseAd] Failed to parse request body for token override:', parseError)
      }
    }

    console.log('[MetaPauseAd] Determined token override:', {
      hasToken: Boolean(tokenOverride),
    })

    const result = tokenOverride
      ? await pauseAdWithToken(adId, campaignId, tokenOverride)
      : await pauseAd(adId, campaignId)

    return NextResponse.json({ success: true, status: result.status })
  } catch (error) {
    console.error('[MetaPauseAd] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to pause ad'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

