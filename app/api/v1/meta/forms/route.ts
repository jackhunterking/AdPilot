/**
 * Feature: Meta Forms API v1
 * Purpose: List and create Meta Instant Forms
 * References:
 *  - Facebook leadgen_forms: https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 *  - Supabase Auth: https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, getGraphVersion } from '@/lib/meta/service'

interface LeadFormSummary {
  id: string
  name?: string
  created_time?: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'campaignId required' } },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .maybeSingle()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Campaign not found or access denied' } },
        { status: 403 }
      )
    }

    const conn = await getConnectionWithToken({ campaignId })
    const pageId = conn?.selected_page_id
    const pageAccessToken = conn?.selected_page_access_token

    if (!pageId || !pageAccessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'not_connected', message: 'Meta page not connected' } },
        { status: 400 }
      )
    }

    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(pageId)}/leadgen_forms?fields=id,name,created_time&limit=100`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errJson: unknown = await res.json().catch(() => ({}))
      const msg = (errJson && typeof errJson === 'object' && errJson !== null && (errJson as { error?: { message?: string } }).error?.message)
        || 'Failed to list forms'
      return NextResponse.json(
        { success: false, error: { code: 'meta_api_error', message: msg } },
        { status: 502 }
      )
    }

    const json: unknown = await res.json()
    const list = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
      ? (json as { data: Array<{ id?: string; name?: string; created_time?: string }> }).data
      : []
    const forms: LeadFormSummary[] = list
      .filter((f) => typeof f.id === 'string')
      .map((f) => ({ id: f.id as string, name: f.name, created_time: f.created_time }))

    return NextResponse.json({
      success: true,
      data: { forms }
    })
  } catch (error) {
    console.error('[v1/meta/forms] GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Server error' } },
      { status: 500 }
    )
  }
}
