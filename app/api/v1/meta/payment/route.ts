/**
 * Feature: Meta Payment API v1
 * Purpose: Unified endpoint for payment status check and validation
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side
 * 
 * Replaces:
 *  - /api/meta/payment/route.ts
 *  - /api/meta/payment/status/route.ts
 *  - /api/meta/payment/validate-simple/route.ts
 *  - /api/meta/payments/check/route.ts
 *  - /api/meta/payments/capability/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnection, validateAdAccount, markPaymentConnected } from '@/lib/meta/service'
import type { PaymentStatus } from '@/lib/types/api'

// ============================================================================
// GET /api/v1/meta/payment - Check payment status
// Query params: ?campaignId=xxx (required), ?adAccountId=xxx (optional)
// ============================================================================

export async function GET(req: NextRequest) {
  console.log('[v1/meta/payment] GET request started')
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const adAccountId = searchParams.get('adAccountId')
    
    console.log('[v1/meta/payment] Request params:', { campaignId, adAccountId })
    
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

    // Get connection
    const conn = await getConnection({ campaignId })
    const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token || null
    if (!token) {
      console.warn('[v1/meta/payment] No token found for campaign:', campaignId)
      return NextResponse.json({
        success: true,
        data: { paymentConnected: false, connected: false }
      })
    }

    // Determine ad account ID
    const actId = adAccountId || (conn as { selected_ad_account_id?: string } | null)?.selected_ad_account_id
    if (!actId) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'No ad account selected or provided' } },
        { status: 400 }
      )
    }

    // Check payment via Meta API
    const validation = await validateAdAccount({ token, actId })
    const paymentConnected = Boolean(validation.hasFunding)

    console.log('[v1/meta/payment] Payment status:', { paymentConnected, campaignId, adAccountId: actId })

    // Update connection if payment is connected
    if (paymentConnected) {
      console.log('[v1/meta/payment] Updating payment connected flag in database')
      try {
        await markPaymentConnected({ campaignId })
      } catch (e) {
        console.error('[v1/meta/payment] Failed to update payment flag:', e)
      }
    }

    const response: PaymentStatus = {
      paymentConnected,
      adAccountId: actId,
      capabilities: validation.capabilities || []
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('[v1/meta/payment] GET error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to check payment status' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/v1/meta/payment - Mark payment as connected
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const campaignId = (body && typeof body === 'object' && body !== null && typeof (body as { campaignId?: string }).campaignId === 'string')
      ? (body as { campaignId: string }).campaignId
      : null
    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'campaignId required' } },
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

    // Verify user owns the campaign
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

    await markPaymentConnected({ campaignId })

    return NextResponse.json({
      success: true,
      data: { message: 'Payment marked as connected' }
    })
  } catch (error) {
    console.error('[v1/meta/payment] POST error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Server error' } },
      { status: 500 }
    )
  }
}

