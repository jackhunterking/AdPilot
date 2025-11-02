/**
 * Feature: Meta Instant Forms (Detail)
 * Purpose: Return detail for a specific Instant Form (questions subset + privacy url)
 * References:
 *  - Facebook Graph API leadgen_form: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 *  - Supabase (server): https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, fetchPagesWithTokens, getGraphVersion } from '@/lib/meta/service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: formId } = await params
    if (!formId) return NextResponse.json({ error: 'Form id required' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    // Extract optional client tokens from query params (fallback for localStorage)
    const clientPageId = searchParams.get('pageId')
    const clientPageToken = searchParams.get('pageAccessToken')

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .maybeSingle()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Try Supabase first (existing behavior)
    const conn = await getConnectionWithToken({ campaignId })

    let pageId: string = ''
    let pageAccessToken: string = ''
    let source: 'supabase' | 'localStorage' | 'derived' = 'supabase'

    if (conn?.selected_page_id && conn?.long_lived_user_token) {
      // Supabase has data - use it
      pageId = conn.selected_page_id

      // Try to get page access token from stored value or derive it
      if (conn.selected_page_access_token) {
        pageAccessToken = conn.selected_page_access_token
        source = 'supabase'
      } else {
        // Derive from long-lived token
        const pages = await fetchPagesWithTokens({ token: conn.long_lived_user_token })
        const match = pages.find(p => p.id === pageId) || null
        pageAccessToken = match?.access_token || ''
        source = pageAccessToken ? 'derived' : 'supabase'
      }
    } else {
      // 2. Supabase empty - fall back to client-provided tokens
      if (clientPageId && clientPageToken) {
        pageId = clientPageId
        pageAccessToken = clientPageToken
        source = 'localStorage'

        console.log('[Meta Instant Forms] Using localStorage fallback:', {
          campaignId,
          formId,
          pageId,
          hasToken: !!pageAccessToken,
        })
      }
    }

    // 3. Validate we have what we need
    if (!pageId || !pageAccessToken) {
      console.error('[Meta Instant Forms] Missing tokens:', {
        campaignId,
        formId,
        hasSupabaseConn: !!conn,
        hasClientTokens: !!(clientPageId && clientPageToken),
        pageId: !!pageId,
        pageAccessToken: !!pageAccessToken,
      })
      return NextResponse.json({
        error: 'No Meta connection found. Please connect Meta first.',
        details: 'Missing page ID or access token'
      }, { status: 400 })
    }

    console.log('[Meta Instant Forms] Using tokens from:', source, {
      campaignId,
      formId,
      pageId,
    })

    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(formId)}?fields=id,name,questions{type},privacy_policy_url`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: 'no-store',
    })

    const json: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (json && typeof json === 'object' && json !== null && (json as { error?: { message?: string } }).error?.message)
        || 'Failed to load form detail'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    // Narrow to shape used by UI
    const out = (json && typeof json === 'object' && json !== null) ? (json as {
      id?: string
      name?: string
      questions?: Array<{ type?: string }>
      privacy_policy_url?: string
    }) : {}

    return NextResponse.json({
      id: typeof out.id === 'string' ? out.id : '',
      name: typeof out.name === 'string' ? out.name : '',
      questions: Array.isArray(out.questions) ? out.questions : [],
      privacy_policy_url: typeof out.privacy_policy_url === 'string' ? out.privacy_policy_url : undefined,
    })
  } catch (error) {
    console.error('[MetaInstantFormDetail] GET error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


