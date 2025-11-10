/**
 * Feature: Resume Individual Ad
 * Purpose: Resume a specific paused Meta ad without affecting other ads in the campaign
 * References:
 *  - Meta Ad Status Updates: https://developers.facebook.com/docs/marketing-api/reference/adgroup#Updating
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { resumeAd, resumeAdWithToken } from '@/lib/meta/ad-operations'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params

    console.log('[MetaResumeAd] POST request:', { campaignId, adId })

    const supabase = await createServerClient()

    // Verify user owns the campaign
    const { data: user, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[MetaResumeAd] Auth getUser error:', authError)
    }
    if (!user?.user) {
      console.warn('[MetaResumeAd] Unauthorized request', { campaignId, adId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      console.error('[MetaResumeAd] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.user.id) {
      console.warn('[MetaResumeAd] Forbidden request', {
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
        console.warn('[MetaResumeAd] Failed to parse request body for token override:', parseError)
      }
    }

    console.log('[MetaResumeAd] Determined token override:', {
      hasToken: Boolean(tokenOverride),
    })

    const result = tokenOverride
      ? await resumeAdWithToken(adId, campaignId, tokenOverride)
      : await resumeAd(adId, campaignId)

    return NextResponse.json({ success: true, status: result.status })
  } catch (error) {
    console.error('[MetaResumeAd] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to resume ad'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

