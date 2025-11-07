/**
 * Feature: Publish Status Polling
 * Purpose: Return the latest Meta publish status snapshot for a campaign owned by the current user.
 * References:
 *  - Meta Campaign Status: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { getPublishStatus } from '@/lib/meta/publisher'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const campaignId = new URL(req.url).searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      console.error('[MetaPublishStatus] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = await getPublishStatus(campaignId)
    return NextResponse.json({ status })
  } catch (error) {
    console.error('[MetaPublishStatus] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to load publish status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
