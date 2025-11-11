/**
 * Feature: Refresh Leads
 * Purpose: Pull latest Meta instant form leads and cache them in Supabase.
 * References:
 *  - Meta Lead Retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { refreshLeadsFromMeta } from '@/lib/meta/leads'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface RefreshBody {
  campaignId?: string
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const body = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as RefreshBody)
      : {}

    const campaignId = typeof body.campaignId === 'string' && body.campaignId.trim().length > 0
      ? body.campaignId.trim()
      : null

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
      console.error('[MetaLeadsRefresh] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await refreshLeadsFromMeta(campaignId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[MetaLeadsRefresh] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to refresh leads'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
