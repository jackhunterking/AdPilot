/**
 * Feature: Payment capability API
 * Purpose: Return whether the current user can add/manage payment for the
 *          selected ad account of a campaign. Uses role, finance_permission,
 *          ad-account tasks and funding presence.
 * References:
 *  - Graph API: https://developers.facebook.com/docs/graph-api
 *  - Business User: https://developers.facebook.com/docs/graph-api/reference/business-user/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getPaymentCapability } from '@/lib/meta/payments'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Authorize campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const cap = await getPaymentCapability(campaignId)
    return NextResponse.json(cap)
  } catch (e) {
    console.error('[PaymentCapability] Server error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


