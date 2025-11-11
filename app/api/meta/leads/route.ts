/**
 * Feature: Lead Listing
 * Purpose: Return stored Meta lead form submissions for the campaign owner.
 * References:
 *  - Meta Lead Retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { getStoredLeads } from '@/lib/meta/leads'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
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
      console.error('[MetaLeads] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const leads = await getStoredLeads(campaignId)
    return NextResponse.json({ leads })
  } catch (error) {
    console.error('[MetaLeads] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to load leads'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
