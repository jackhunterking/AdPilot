/**
 * Feature: List Business-owned Pages (v1)
 * Purpose: Server-proxy Graph call using user's stored token
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Pages API: lib/meta/pages.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { createServerClient } from '@/lib/supabase/server'
import { fetchBusinessOwnedPages } from '@/lib/meta/pages'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    
    if (!businessId) {
      throw new ValidationError('businessId query parameter required')
    }

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
      return successResponse({ data: [] })
    }

    const data = await fetchBusinessOwnedPages({ token, businessId })
    return successResponse({ data })
  } catch (error) {
    console.error('[GET /api/v1/meta/pages] Error:', error)
    return errorResponse(error as Error)
  }
}
