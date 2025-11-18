/**
 * Feature: Meta payment status
 * Purpose: Mark payment connected flag and reflect status for a campaign
 * References:
 *  - Supabase (Server client): https://supabase.com/docs/guides/auth/server-side/creating-a-client
 *  - Facebook Payments UI: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { markPaymentConnected, updateCampaignState } from '@/lib/meta/service'

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const campaignId = (body && typeof body === 'object' && body !== null && typeof (body as { campaignId?: string }).campaignId === 'string')
      ? (body as { campaignId: string }).campaignId
      : null
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user owns the campaign
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await markPaymentConnected({ campaignId })
    await updateCampaignState({ campaignId, status: 'payment_linked' })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MetaPayment] Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


