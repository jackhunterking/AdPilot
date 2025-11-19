/**
 * Feature: Meta Assets (Combined Endpoint) (v1)
 * Purpose: Unified endpoint for businesses, pages, and ad accounts
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Business API: lib/meta/business.ts
 *  - Meta Pages API: lib/meta/pages.ts
 *  - Meta Ad Accounts API: lib/meta/ad-accounts.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { createServerClient } from '@/lib/supabase/server'
import { fetchUserBusinesses } from '@/lib/meta/business'
import { fetchBusinessOwnedPages } from '@/lib/meta/pages'
import { fetchBusinessOwnedAdAccounts } from '@/lib/meta/ad-accounts'

type AssetType = 'businesses' | 'pages' | 'adAccounts' | 'all'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    const { searchParams } = new URL(req.url)
    const typeParam = searchParams.get('type') || 'all'
    const businessId = searchParams.get('businessId')
    
    const type: AssetType = ['businesses', 'pages', 'adAccounts', 'all'].includes(typeParam)
      ? (typeParam as AssetType)
      : 'all'

    // Get user's Meta token
    const supabase = await createServerClient()
    const { data: userTokenRow } = await supabase
      .from('meta_tokens')
      .select('token, token_type')
      .eq('user_id', user.id)
      .eq('token_type', 'user')
      .maybeSingle()

    const token = userTokenRow?.token || (await (async () => {
      const { data: sys } = await supabase
        .from('meta_tokens')
        .select('token, token_type')
        .eq('user_id', user.id)
        .eq('token_type', 'system')
        .maybeSingle()
      return sys?.token || null
    })())

    if (!token) {
      return successResponse({
        businesses: [],
        pages: [],
        adAccounts: []
      })
    }

    const result: {
      businesses?: unknown[]
      pages?: unknown[]
      adAccounts?: unknown[]
    } = {}

    // Fetch based on type
    if (type === 'businesses' || type === 'all') {
      result.businesses = await fetchUserBusinesses({ token })
    }

    if ((type === 'pages' || type === 'all') && businessId) {
      result.pages = await fetchBusinessOwnedPages({ token, businessId })
    }

    if ((type === 'adAccounts' || type === 'all') && businessId) {
      result.adAccounts = await fetchBusinessOwnedAdAccounts({ token, businessId })
    }

    return successResponse(result)
  } catch (error) {
    console.error('[GET /api/v1/meta/assets] Error:', error)
    return errorResponse(error as Error)
  }
}

