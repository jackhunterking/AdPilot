/**
 * Feature: Metrics Breakdown (v1)
 * Purpose: Provide age/gender breakdowns for the Results tab using Meta Insights
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Insights API: https://developers.facebook.com/docs/marketing-api/insights/breakdowns
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { fetchMetricsBreakdown, type MetricsBreakdownType, type MetricsRangeKey } from '@/lib/meta/insights'

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
    const user = await requireAuth(req)
    
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    
    if (!campaignId) {
      throw new ValidationError('campaignId query parameter required')
    }

    const breakdown = parseBreakdownType(url.searchParams.get('type'))
    const range = parseRange(url.searchParams.get('dateRange'))

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    const rows = await fetchMetricsBreakdown(campaignId, breakdown, range)
    
    return successResponse({ 
      breakdown, 
      range, 
      rows 
    })
  } catch (error) {
    console.error('[GET /api/v1/meta/breakdown] Error:', error)
    return errorResponse(error as Error)
  }
}

