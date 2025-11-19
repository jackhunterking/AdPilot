/**
 * Feature: Meta Instant Forms (v1)
 * Purpose: List instant forms (delegates to forms endpoint for compatibility)
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Facebook leadgen_forms: https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse, successResponse } from '@/app/api/v1/_middleware'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    
    // Delegate to forms endpoint
    const proxyUrl = new URL('/api/v1/meta/forms', req.url)
    if (campaignId) {
      proxyUrl.searchParams.set('campaignId', campaignId)
    }

    // Forward cookies for auth
    const res = await fetch(proxyUrl, {
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
      cache: 'no-store',
    })

    const json: unknown = await res.json().catch(() => ({}))
    
    if (!res.ok) {
      const msg = (json && typeof json === 'object' && json !== null && (json as { error?: string }).error) || 'Failed'
      return NextResponse.json({ error: msg }, { status: res.status || 502 })
    }

    const forms = (json && typeof json === 'object' && json !== null && Array.isArray((json as { forms?: unknown[] }).forms))
      ? (json as { forms: Array<unknown> }).forms
      : []
      
    return successResponse({ data: forms })
  } catch (error) {
    console.error('[GET /api/v1/meta/instant-forms] Error:', error)
    return errorResponse(error as Error)
  }
}

