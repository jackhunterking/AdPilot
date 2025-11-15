/**
 * Feature: Meta Connection Status API v1
 * Purpose: Unified endpoint to check Meta connection status for a campaign
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api
 * 
 * Replaces:
 *  - /api/meta/selection/route.ts
 *  - /api/meta/connections/status/route.ts
 *  - /api/meta/connection/route.ts (GET only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnectionPublic } from '@/lib/meta/service'
import type { MetaConnectionStatus } from '@/lib/types/api'

// ============================================================================
// GET /api/v1/meta/status - Get Meta connection status
// Query params: ?campaignId=xxx (required)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'campaignId query parameter required' } },
        { status: 400 }
      )
    }

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
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Campaign not found or access denied' } },
        { status: 403 }
      )
    }

    // Get connection using existing service
    const conn = await getConnectionPublic({ campaignId })

    // Fallback to campaign_states for backward compatibility during migration
    const { data: state } = await supabaseServer
      .from('campaign_states')
      .select('meta_connect_data')
      .eq('campaign_id', campaignId)
      .maybeSingle()

    // Build unified status response
    const stateStatus = (state as { meta_connect_data?: { status?: string } } | null)?.meta_connect_data?.status || null
    let connectionStatus = 'disconnected'
    if (conn) {
      connectionStatus = conn.ad_account_payment_connected ? 'payment_linked' : 'connected'
    } else if (stateStatus) {
      connectionStatus = stateStatus
    }

    const statusResponse: MetaConnectionStatus = conn ? {
      connected: true,
      business: conn.selected_business_id ? {
        id: conn.selected_business_id,
        name: conn.selected_business_name ?? undefined
      } : null,
      page: conn.selected_page_id ? {
        id: conn.selected_page_id,
        name: conn.selected_page_name ?? undefined
      } : null,
      adAccount: conn.selected_ad_account_id ? {
        id: conn.selected_ad_account_id,
        name: conn.selected_ad_account_name ?? undefined
      } : null,
      instagram: conn.selected_ig_user_id ? {
        id: conn.selected_ig_user_id,
        username: conn.selected_ig_username ?? undefined
      } : null,
      paymentConnected: Boolean(conn.ad_account_payment_connected),
      adminConnected: Boolean(conn.admin_connected),
      adminBusinessRole: conn.admin_business_role ?? undefined,
      adminAdAccountRole: conn.admin_ad_account_role ?? undefined,
      userAppConnected: Boolean(conn.user_app_connected ?? false),
      status: connectionStatus
    } : {
      connected: false,
      paymentConnected: false,
      adminConnected: false,
      userAppConnected: false,
      status: 'disconnected'
    }

    console.log('[v1/meta/status] Returning connection status:', {
      campaignId,
      hasConnection: !!conn,
      status: connectionStatus,
      paymentConnected: statusResponse.paymentConnected,
      adminConnected: statusResponse.adminConnected,
    })

    return NextResponse.json({
      success: true,
      data: statusResponse
    })
  } catch (error) {
    console.error('[v1/meta/status] Server error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      campaignId: new URL(req.url).searchParams.get('campaignId'),
    })
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

