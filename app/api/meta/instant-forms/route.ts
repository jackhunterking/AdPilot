/**
 * Feature: Meta Instant Forms (Proxy List)
 * Purpose: Provide a stable endpoint returning { data } for tests by proxying to /api/meta/forms
 * References:
 *  - Facebook leadgen_forms (indirect): https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const proxyUrl = new URL('/api/meta/forms', req.url)
    proxyUrl.searchParams.set('campaignId', campaignId)

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
    return NextResponse.json({ data: forms })
  } catch (error) {
    console.error('[MetaInstantFormsProxy] GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}







