/**
 * Feature: Cached Metrics Fetch (v1)
 * Purpose: Return the most recently cached Meta Insights metrics for a campaign
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { getCachedMetrics, type MetricsRangeKey } from '@/lib/meta/insights'
import { supabaseServer } from '@/lib/supabase/server'

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
    const user = await requireAuth(req)
    
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    
    if (!campaignId) {
      throw new ValidationError('campaignId query parameter required')
    }

    const range = parseRange(url.searchParams.get('dateRange'))

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,last_metrics_sync_at,published_status')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('[GET /api/v1/meta/metrics] Campaign lookup failed:', campaignError)
      throw new Error('Failed to load campaign')
    }

    const metrics = await getCachedMetrics(campaignId, range)

    return successResponse({
      range,
      metrics,
      columns: KPI_COLUMNS,
      publishedStatus: campaign.published_status,
      lastSyncAt: campaign.last_metrics_sync_at,
    })
  } catch (error) {
    console.error('[GET /api/v1/meta/metrics] Error:', error)
    return errorResponse(error as Error)
  }
}

