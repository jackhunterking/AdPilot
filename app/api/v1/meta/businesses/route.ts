/**
 * Feature: List user's Businesses (v1)
 * Purpose: Server-proxy Graph call using user's stored token
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Business API: lib/meta/business.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, successResponse } from '@/app/api/v1/_middleware'
import { createServerClient } from '@/lib/supabase/server'
import { fetchUserBusinesses } from '@/lib/meta/business'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
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

    const data = await fetchUserBusinesses({ token })
    return successResponse({ data })
  } catch (error) {
    console.error('[GET /api/v1/meta/businesses] Error:', error)
    return errorResponse(error as Error)
  }
}

