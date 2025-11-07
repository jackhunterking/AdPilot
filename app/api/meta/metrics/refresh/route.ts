/**
 * Feature: Manual Metrics Refresh
 * Purpose: Fetch fresh Meta Insights metrics on demand and cache them for the Results tab.
 * References:
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { refreshCampaignMetrics, type MetricsRangeKey } from '@/lib/meta/insights'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface RefreshRequestBody {
  campaignId?: string
  range?: MetricsRangeKey
}

function parseRange(range: RefreshRequestBody['range']): MetricsRangeKey {
  if (range === '30d' || range === 'lifetime') {
    return range
  }
  return '7d'
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const body = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as RefreshRequestBody)
      : {}

    const campaignId = typeof body.campaignId === 'string' && body.campaignId.trim().length > 0
      ? body.campaignId.trim()
      : null

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const range = parseRange(body.range)

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id,published_status')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      console.error('[MetaMetricsRefresh] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (campaign.published_status !== 'active' && campaign.published_status !== 'paused') {
      return NextResponse.json({ error: 'Campaign must be published before refreshing metrics.' }, { status: 400 })
    }

    const metrics = await refreshCampaignMetrics(campaignId, range)

    return NextResponse.json({ success: true, metrics })
  } catch (error) {
    console.error('[MetaMetricsRefresh] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to refresh metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
