/**
 * Feature: Meta Assets API v1
 * Purpose: Unified endpoint to fetch all Meta assets (businesses, pages, ad accounts)
 * References:
 *  - Meta Graph API: https://developers.facebook.com/docs/graph-api
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side
 * 
 * Replaces:
 *  - /api/meta/businesses/route.ts
 *  - /api/meta/pages/route.ts
 *  - /api/meta/ad-accounts/route.ts
 *  - /api/meta/business-connections/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { fetchBusinesses, fetchPagesWithTokens, fetchAdAccounts } from '@/lib/meta/service'
import type { MetaAssets } from '@/lib/types/api'

// ============================================================================
// GET /api/v1/meta/assets - Get Meta assets
// Query params: ?campaignId=xxx (required), ?type=all|businesses|pages|adAccounts (optional)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const assetType = searchParams.get('type') || 'all'

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
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Campaign not found or access denied' } },
        { status: 403 }
      )
    }

    // Get Meta token from connection service (campaign_states table removed)
    const { getConnectionWithToken } = await import('@/lib/meta/service')
    const conn = await getConnectionWithToken({ campaignId })

    if (!conn?.long_lived_user_token) {
      return NextResponse.json(
        { success: false, error: { code: 'not_connected', message: 'Meta not connected for this campaign' } },
        { status: 404 }
      )
    }

    const token = conn.long_lived_user_token

    console.log('[v1/meta/assets] Fetching assets:', { campaignId, assetType })

    // Fetch assets in parallel based on type
    const promises: Promise<unknown>[] = []
    let fetchBusinesses_promise: Promise<unknown> | null = null
    let fetchPages_promise: Promise<unknown> | null = null
    let fetchAdAccounts_promise: Promise<unknown> | null = null

    if (assetType === 'all' || assetType === 'businesses') {
      fetchBusinesses_promise = fetchBusinesses({ token })
      promises.push(fetchBusinesses_promise)
    }
    if (assetType === 'all' || assetType === 'pages') {
      fetchPages_promise = fetchPagesWithTokens({ token })
      promises.push(fetchPages_promise)
    }
    if (assetType === 'all' || assetType === 'adAccounts') {
      fetchAdAccounts_promise = fetchAdAccounts({ token })
      promises.push(fetchAdAccounts_promise)
    }

    const results = await Promise.all(promises)

    let businessesData = null
    let pagesData = null
    let adAccountsData = null
    let resultIndex = 0

    if (fetchBusinesses_promise) {
      businessesData = results[resultIndex++]
    }
    if (fetchPages_promise) {
      pagesData = results[resultIndex++]
    }
    if (fetchAdAccounts_promise) {
      adAccountsData = results[resultIndex++]
    }

    const response = {
      businesses: businessesData,
      pages: pagesData,
      adAccounts: adAccountsData,
    }

    console.log('[v1/meta/assets] Assets fetched successfully:', {
      businessesCount: Array.isArray(response.businesses) ? response.businesses.length : 0,
      pagesCount: Array.isArray(response.pages) ? response.pages.length : 0,
      adAccountsCount: Array.isArray(response.adAccounts) ? response.adAccounts.length : 0,
    })

    return NextResponse.json(
      {
        success: true,
        data: response
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600', // 5min cache
        },
      }
    )
  } catch (error) {
    console.error('[v1/meta/assets] Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to fetch assets' } },
      { status: 500 }
    )
  }
}

