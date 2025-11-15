/**
 * Feature: Meta Metrics API v1
 * Purpose: Fetch cached Meta Insights metrics for campaigns
 * References:
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 *  - Supabase Auth: https://supabase.com/docs/reference/javascript/auth-getuser
 * 
 * Replaces:
 *  - /api/meta/metrics/route.ts
 *  - /api/meta/metrics/refresh/route.ts (auto-refresh on GET with stale check)
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

// ============================================================================
// GET /api/v1/meta/metrics - Get metrics for campaign
// Query params: ?campaignId=xxx (required), ?dateRange=7d|30d|lifetime (optional)
// ============================================================================

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

    const range = parseRange(url.searchParams.get('dateRange'))

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id,last_metrics_sync_at,published_status')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      console.error('[v1/meta/metrics] Campaign lookup failed:', campaignError)
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

    // Get cached metrics (getCachedMetrics auto-refreshes if stale)
    const metrics = await getCachedMetrics(campaignId, range)

    return NextResponse.json(
      {
        success: true,
        data: {
          range,
          metrics,
          columns: KPI_COLUMNS,
          publishedStatus: campaign.published_status,
          lastSyncAt: campaign.last_metrics_sync_at,
        }
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300', // 1min cache
        },
      }
    )
  } catch (error) {
    console.error('[v1/meta/metrics] Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to fetch metrics' } },
      { status: 500 }
    )
  }
}

