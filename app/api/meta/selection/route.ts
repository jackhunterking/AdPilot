/**
 * Feature: Meta selection summary
 * Purpose: Return selected Business/Page/IG/Ad Account and payment status
 *          for a campaign to hydrate the UI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnectionPublic } from '@/lib/meta/service'

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

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const conn = await getConnectionPublic({ campaignId })
    const connError = null

    if (connError) {
      console.error('[MetaSelection] Error fetching connection:', {
        error: connError,
        campaignId,
        userId: user.id,
      })
    }

    // Determine status from connection data (campaign_states no longer exists)
    let status = 'disconnected'
    if (conn) {
      status = conn.ad_account_payment_connected ? 'payment_linked' : 'connected'
    }

    console.log('[MetaSelection] Returning selection data:', {
      campaignId,
      hasConnection: !!conn,
      status,
      businessId: conn?.selected_business_id,
      pageId: conn?.selected_page_id,
      adAccountId: conn?.selected_ad_account_id,
      paymentConnected: conn?.ad_account_payment_connected,
      adminConnected: conn?.admin_connected,
    })

    return NextResponse.json({
      business: conn?.selected_business_id ? { id: conn.selected_business_id, name: conn.selected_business_name ?? undefined } : undefined,
      page: conn?.selected_page_id ? { id: conn.selected_page_id, name: conn.selected_page_name ?? undefined } : undefined,
      instagram: conn?.selected_ig_user_id ? { id: conn.selected_ig_user_id, username: conn.selected_ig_username ?? '' } : null,
      adAccount: conn?.selected_ad_account_id ? { id: conn.selected_ad_account_id, name: conn.selected_ad_account_name ?? undefined } : undefined,
      paymentConnected: Boolean(conn?.ad_account_payment_connected),
      adminConnected: Boolean(conn?.admin_connected),
      adminBusinessRole: conn?.admin_business_role ?? null,
      adminAdAccountRole: conn?.admin_ad_account_role ?? null,
      userAppConnected: Boolean((conn as { user_app_connected?: boolean } | null)?.user_app_connected ?? false),
      status,
    })
  } catch (error) {
    console.error('[MetaSelection] Server error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      campaignId: new URL(req.url).searchParams.get('campaignId'),
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


