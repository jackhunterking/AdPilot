/**
 * Feature: Meta Connection API
 * Purpose: Manage Meta OAuth connection status and initiation
 * References:
 *  - Meta OAuth: https://developers.facebook.com/docs/facebook-login
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs/guides/auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { buildBusinessLoginUrl, generateRandomState } from '@/lib/meta/login'
import type { MetaConnectionSummary } from '@/lib/types/meta-integration'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    // Fetch connection from campaign_meta_connections
    const { data: connection, error: connError } = await supabase
      .from('campaign_meta_connections')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (connError && connError.code !== 'PGRST116') {
      throw connError
    }

    // Build summary
    const summary: MetaConnectionSummary = {
      status: (connection?.connection_status as MetaConnectionSummary['status']) || 'disconnected',
      paymentStatus: (connection?.payment_status as MetaConnectionSummary['paymentStatus']) || 'unknown',
      business: connection?.selected_business_id ? {
        id: connection.selected_business_id,
        name: connection.selected_business_name,
      } : undefined,
      page: connection?.selected_page_id ? {
        id: connection.selected_page_id,
        name: connection.selected_page_name,
      } : undefined,
      instagram: connection?.selected_ig_user_id ? {
        id: connection.selected_ig_user_id,
        username: connection.selected_ig_username,
      } : null,
      adAccount: connection?.selected_ad_account_id ? {
        id: connection.selected_ad_account_id,
        name: connection.selected_ad_account_name,
      } : undefined,
      lastVerifiedAt: connection?.last_verified_at,
    }

    const needsReconnect = 
      connection?.connection_status === 'expired' ||
      connection?.payment_status === 'missing' ||
      connection?.payment_status === 'flagged'

    return NextResponse.json({
      connection: summary,
      needsReconnect,
    })

  } catch (error) {
    console.error('[Meta Connection GET]', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, redirectUrl } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    // Generate OAuth state
    const state = generateRandomState()
    
    // Build Meta OAuth URL
    const authUrl = buildBusinessLoginUrl(state, redirectUrl)

    // Update connection status to 'pending'
    await supabase
      .from('campaign_meta_connections')
      .upsert({
        campaign_id: campaignId,
        user_id: user.id,
        connection_status: 'pending',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'campaign_id',
      })

    return NextResponse.json({ authUrl, state })

  } catch (error) {
    console.error('[Meta Connection POST]', error)
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    )
  }
}

