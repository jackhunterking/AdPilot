/**
 * Feature: Metrics Breakdown API v1
 * Purpose: Provide age/gender breakdowns for the Results tab using Meta Insights
 * References:
 *  - Meta Insights API (Breakdowns): https://developers.facebook.com/docs/marketing-api/insights/breakdowns
 *  - Supabase Auth: https://supabase.com/docs/reference/javascript/auth-getuser
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
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'campaignId required' } },
        { status: 400 }
      )
    }

    const breakdown = parseBreakdownType(url.searchParams.get('type'))
    const range = parseRange(url.searchParams.get('dateRange'))

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id,published_status')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      console.error('[v1/meta/breakdown] Campaign lookup failed:', campaignError)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: 'Failed to load campaign' } },
        { status: 500 }
      )
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Campaign not found or access denied' } },
        { status: 403 }
      )
    }

    const rows = await fetchMetricsBreakdown(campaignId, breakdown, range)
    
    return NextResponse.json({
      success: true,
      data: { breakdown, range, rows }
    })
  } catch (error) {
    console.error('[v1/meta/breakdown] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch breakdown data'
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message } },
      { status: 500 }
    )
  }
}
