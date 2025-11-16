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

    // Get admin status from meta connection service
    // Note: campaign_states table removed - using getConnectionWithToken service
    const { getConnectionWithToken } = await import('@/lib/meta/service')
    const conn = await getConnectionWithToken({ campaignId })

    const response: AdminStatus = {
      adminConnected: conn?.admin_connected || false,
      businessRole: conn?.admin_business_role || undefined,
      adAccountRole: conn?.admin_ad_account_role || undefined,
      checkedAt: conn?.admin_checked_at || undefined
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

