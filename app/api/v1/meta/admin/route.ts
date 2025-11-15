/**
 * Feature: Meta Admin Verification API v1
 * Purpose: Unified endpoint for admin verification and access requests
 * References:
 *  - Business assigned users: https://developers.facebook.com/docs/graph-api/reference/business/assigned_users/
 *  - Ad Account users/roles: https://developers.facebook.com/docs/marketing-api/reference/ad-account/
 * 
 * Replaces:
 *  - /api/meta/admin/verify/route.ts
 *  - /api/meta/admin/verify-simple/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/meta/service'
import type { AdminStatus } from '@/lib/types/api'

// ============================================================================
// GET /api/v1/meta/admin - Check admin status
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

    // Get admin status from campaign_states (backward compatibility)
    const { data: state } = await supabaseServer
      .from('campaign_states')
      .select('meta_connect_data')
      .eq('campaign_id', campaignId)
      .maybeSingle()

    const metaConnectData = (state as { meta_connect_data?: { admin_connected?: boolean; admin_business_role?: string; admin_ad_account_role?: string; admin_checked_at?: string } } | null)?.meta_connect_data

    const response: AdminStatus = {
      adminConnected: metaConnectData?.admin_connected || false,
      businessRole: metaConnectData?.admin_business_role || undefined,
      adAccountRole: metaConnectData?.admin_ad_account_role || undefined,
      checkedAt: metaConnectData?.admin_checked_at || undefined
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('[v1/meta/admin] GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/v1/meta/admin - Verify admin access
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const body = (await req.json()) as unknown
    const campaignId = (body && typeof body === 'object' && body !== null ? (body as { campaignId?: string }).campaignId : undefined) || null
    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'campaignId required' } },
        { status: 400 }
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

    try {
      const result = await verifyAdminAccess(campaignId)
      
      const response: AdminStatus = {
        adminConnected: result.adminConnected,
        businessRole: result.businessRole || undefined,
        adAccountRole: result.adAccountRole || undefined,
        checkedAt: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        data: response
      })
    } catch (verifyError) {
      const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error'
      console.error('[v1/meta/admin] Verification failed:', errorMessage)
      
      // Return specific error for missing user token
      if (errorMessage.includes('User app token required')) {
        return NextResponse.json({ 
          success: false,
          error: {
            code: 'user_login_required',
            message: errorMessage,
            details: { requiresUserLogin: true }
          }
        }, { status: 400 })
      }
      
      throw verifyError
    }
  } catch (error) {
    console.error('[v1/meta/admin] POST error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Server error' } },
      { status: 500 }
    )
  }
}

