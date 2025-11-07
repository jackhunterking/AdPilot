/**
 * Feature: Metrics Breakdown
 * Purpose: Provide age/gender breakdowns for the Results tab using Meta Insights.
 * References:
 *  - Meta Insights API (Breakdowns): https://developers.facebook.com/docs/marketing-api/insights/breakdowns
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { fetchMetricsBreakdown, type MetricsBreakdownType, type MetricsRangeKey } from '@/lib/meta/insights'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

function parseBreakdownType(value: string | null): MetricsBreakdownType {
  return value === 'gender' ? 'gender' : 'age'
}

function parseRange(value: string | null): MetricsRangeKey {
  if (value === '30d' || value === 'lifetime') {
    return value
  }
  return '7d'
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const breakdown = parseBreakdownType(url.searchParams.get('type'))
    const range = parseRange(url.searchParams.get('dateRange'))

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
      console.error('[MetaBreakdown] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rows = await fetchMetricsBreakdown(campaignId, breakdown, range)
    return NextResponse.json({ breakdown, range, rows })
  } catch (error) {
    console.error('[MetaBreakdown] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch breakdown data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
