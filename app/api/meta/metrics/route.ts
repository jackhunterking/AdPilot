/**
 * Feature: Cached Metrics Fetch
 * Purpose: Return the most recently cached Meta Insights metrics for a campaign with enhanced KPI data structure.
 * References:
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { getCachedMetrics, type MetricsRangeKey } from '@/lib/meta/insights'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

function parseRange(param: string | null): MetricsRangeKey {
  if (param === '30d' || param === 'lifetime') {
    return param
  }
  return '7d'
}

interface ColumnDefinition {
  key: string
  label: string
  type: 'number' | 'currency' | 'percentage'
  format?: string
}

const KPI_COLUMNS: ColumnDefinition[] = [
  { key: 'impressions', label: 'Impressions', type: 'number' },
  { key: 'reach', label: 'Reach', type: 'number' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'percentage' },
  { key: 'cpc', label: 'CPC', type: 'currency' },
  { key: 'cpm', label: 'CPM', type: 'currency' },
  { key: 'spend', label: 'Spend', type: 'currency' },
  { key: 'results', label: 'Results', type: 'number' },
  { key: 'cost_per_result', label: 'Cost per Result', type: 'currency' },
]

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const range = parseRange(url.searchParams.get('dateRange'))

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id,last_metrics_sync_at,published_status')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      console.error('[MetaMetrics] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const metrics = await getCachedMetrics(campaignId, range)

    return NextResponse.json({
      range,
      metrics,
      columns: KPI_COLUMNS,
      publishedStatus: campaign.published_status,
      lastSyncAt: campaign.last_metrics_sync_at,
    })
  } catch (error) {
    console.error('[MetaMetrics] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to load metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
