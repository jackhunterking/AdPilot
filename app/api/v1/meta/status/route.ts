/**
 * Feature: Meta Connection Status (v1)
 * Purpose: Check complete Meta connection status for a campaign
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Service: lib/meta/service.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { getConnectionPublic } from '@/lib/meta/service'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    
    if (!campaignId) {
      throw new ValidationError('campaignId query parameter required')
    }

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    const conn = await getConnectionPublic({ campaignId })
    
    const connected = Boolean(
      conn &&
      conn.selected_business_id &&
      conn.selected_page_id &&
      conn.selected_ad_account_id
    )

    return successResponse({
      connected,
      business: conn?.selected_business_id ? {
        id: conn.selected_business_id,
        name: conn.selected_business_name || undefined
      } : null,
      page: conn?.selected_page_id ? {
        id: conn.selected_page_id,
        name: conn.selected_page_name || undefined
      } : null,
      adAccount: conn?.selected_ad_account_id ? {
        id: conn.selected_ad_account_id,
        name: conn.selected_ad_account_name || undefined
      } : null,
      paymentConnected: Boolean(conn?.ad_account_payment_connected),
      adminConnected: Boolean(conn?.admin_connected),
      status: connected ? 'connected' : 'not_connected'
    })
  } catch (error) {
    console.error('[GET /api/v1/meta/status] Error:', error)
    return errorResponse(error as Error)
  }
}

