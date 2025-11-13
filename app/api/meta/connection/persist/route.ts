/**
 * Feature: Persist Meta Connection to Database
 * Purpose: Save Meta connection from localStorage to database for server-side access
 * References:
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface PersistConnectionBody {
  campaignId: string
  connectionData: {
    type: 'system' | 'user_app'
    fb_user_id?: string
    long_lived_user_token?: string
    token_expires_at?: string
    user_app_token?: string
    user_app_token_expires_at?: string
    user_app_fb_user_id?: string
    selected_business_id?: string
    selected_business_name?: string
    selected_page_id?: string
    selected_page_name?: string
    selected_page_access_token?: string
    selected_ig_user_id?: string
    selected_ig_username?: string
    selected_ad_account_id?: string
    selected_ad_account_name?: string
    ad_account_currency_code?: string
    ad_account_payment_connected?: boolean
    admin_connected?: boolean
    admin_checked_at?: string
    admin_business_role?: string
    admin_ad_account_role?: string
    user_app_connected?: boolean
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Persist Connection API] ========================================')
    console.log('[Persist Connection API] 📥 Received persist request')
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Persist Connection API] ❌ Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Persist Connection API] ✅ User authenticated:', user.id)

    // Parse request body
    const body = await req.json() as PersistConnectionBody
    const { campaignId, connectionData } = body

    if (!campaignId) {
      console.error('[Persist Connection API] ❌ Missing campaignId')
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    if (!connectionData) {
      console.error('[Persist Connection API] ❌ Missing connectionData')
      return NextResponse.json({ error: 'connectionData required' }, { status: 400 })
    }

    console.log('[Persist Connection API] Campaign ID:', campaignId)
    console.log('[Persist Connection API] Connection type:', connectionData.type)
    console.log('[Persist Connection API] Has token:', !!connectionData.long_lived_user_token)
    console.log('[Persist Connection API] Ad account:', connectionData.selected_ad_account_id)

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('[Persist Connection API] ❌ Campaign not found:', campaignError?.message)
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.user_id !== user.id) {
      console.error('[Persist Connection API] ❌ Campaign ownership mismatch')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('[Persist Connection API] ✅ Campaign ownership verified')

    // Prepare database payload
    const payload = {
      campaign_id: campaignId,
      user_id: user.id,
      fb_user_id: connectionData.fb_user_id || null,
      long_lived_user_token: connectionData.long_lived_user_token || null,
      token_expires_at: connectionData.token_expires_at || null,
      user_app_token: connectionData.user_app_token || null,
      user_app_token_expires_at: connectionData.user_app_token_expires_at || null,
      user_app_fb_user_id: connectionData.user_app_fb_user_id || null,
      selected_business_id: connectionData.selected_business_id || null,
      selected_business_name: connectionData.selected_business_name || null,
      selected_page_id: connectionData.selected_page_id || null,
      selected_page_name: connectionData.selected_page_name || null,
      selected_page_access_token: connectionData.selected_page_access_token || null,
      selected_ig_user_id: connectionData.selected_ig_user_id || null,
      selected_ig_username: connectionData.selected_ig_username || null,
      selected_ad_account_id: connectionData.selected_ad_account_id || null,
      selected_ad_account_name: connectionData.selected_ad_account_name || null,
      ad_account_currency_code: connectionData.ad_account_currency_code || null,
      ad_account_payment_connected: connectionData.ad_account_payment_connected || false,
      admin_connected: connectionData.admin_connected || false,
      admin_checked_at: connectionData.admin_checked_at || null,
      admin_business_role: connectionData.admin_business_role || null,
      admin_ad_account_role: connectionData.admin_ad_account_role || null,
      user_app_connected: connectionData.user_app_connected || false,
      updated_at: new Date().toISOString()
    }

    console.log('[Persist Connection API] 💾 Persisting to database...')

    // Upsert to database
    const { error: upsertError } = await supabaseServer
      .from('campaign_meta_connections')
      .upsert(payload, { onConflict: 'campaign_id' })

    if (upsertError) {
      console.error('[Persist Connection API] ❌ Database upsert failed:', {
        error: upsertError.message,
        code: upsertError.code,
        details: upsertError.details
      })
      return NextResponse.json(
        { error: 'Failed to persist connection', details: upsertError.message },
        { status: 500 }
      )
    }

    console.log('[Persist Connection API] ✅ Connection persisted successfully')
    console.log('[Persist Connection API] ========================================')

    return NextResponse.json({
      success: true,
      message: 'Connection persisted to database'
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    console.error('[Persist Connection API] ========================================')
    console.error('[Persist Connection API] ❌ Unexpected error')
    console.error('[Persist Connection API] Error:', err.message)
    console.error('[Persist Connection API] Stack:', err.stack)
    console.error('[Persist Connection API] ========================================')
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    )
  }
}

