/**
 * Feature: Meta Instant Forms (List & Create)
 * Purpose: List existing Instant Forms for the selected Page and create new ones
 * References:
 *  - Facebook Graph API leadgen_forms (Page): https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 *  - Facebook Graph API leadgen_form (Create): https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 *  - Supabase (server): https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, fetchPagesWithTokens, getGraphVersion } from '@/lib/meta/service'

interface LeadFormSummary {
  id: string
  name?: string
  created_time?: string
}

async function getAuthorizedContext(
  req: NextRequest,
  clientTokens?: { pageId?: string; pageAccessToken?: string }
): Promise<
  | {
      userId: string
      campaignId: string
      pageId: string
      longToken: string
      pageAccessToken: string
      source: 'supabase' | 'localStorage' | 'derived'
    }
  | { error: Response }
> {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId')
  if (!campaignId) {
    return { error: NextResponse.json({ error: 'campaignId required' }, { status: 400 }) }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select('id,user_id')
    .eq('id', campaignId)
    .maybeSingle()
  if (!campaign || campaign.user_id !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  // 1. Try Supabase first (existing behavior)
  const conn = await getConnectionWithToken({ campaignId })

  let pageId: string = ''
  let pageAccessToken: string = ''
  let longToken: string = ''
  let source: 'supabase' | 'localStorage' | 'derived' = 'supabase'

  if (conn?.selected_page_id && conn?.long_lived_user_token) {
    // Supabase has data - use it
    pageId = conn.selected_page_id
    longToken = conn.long_lived_user_token

    // Try to get page access token from stored value or derive it
    if (conn.selected_page_access_token) {
      pageAccessToken = conn.selected_page_access_token
      source = 'supabase'
    } else {
      // Derive from long-lived token
      const pages = await fetchPagesWithTokens({ token: longToken })
      const match = pages.find(p => p.id === pageId) || null
      pageAccessToken = match?.access_token || ''
      source = pageAccessToken ? 'derived' : 'supabase'
    }
  } else {
    // 2. Supabase empty - fall back to client-provided tokens
    if (clientTokens?.pageId && clientTokens?.pageAccessToken) {
      pageId = clientTokens.pageId
      pageAccessToken = clientTokens.pageAccessToken
      longToken = conn?.long_lived_user_token || '' // May still be in Supabase
      source = 'localStorage'

      console.log('[Meta Forms] Using localStorage fallback:', {
        campaignId,
        pageId,
        hasToken: !!pageAccessToken,
      })
    }
  }

  // 3. Validate we have what we need
  if (!pageId || !pageAccessToken) {
    console.error('[Meta Forms] Missing tokens:', {
      campaignId,
      hasSupabaseConn: !!conn,
      hasClientTokens: !!(clientTokens?.pageId && clientTokens?.pageAccessToken),
      pageId: !!pageId,
      pageAccessToken: !!pageAccessToken,
    })
    return {
      error: NextResponse.json({
        error: 'No Meta connection found. Please connect Meta first.',
        details: 'Missing page ID or access token'
      }, { status: 400 })
    }
  }

  console.log('[Meta Forms] Using tokens from:', source, {
    campaignId,
    pageId,
    hasLongToken: !!longToken,
  })

  return { userId: user.id, campaignId, pageId, longToken, pageAccessToken, source }
}

export async function GET(req: NextRequest) {
  try {
    // Extract optional client tokens from query params (fallback for localStorage)
    const { searchParams } = new URL(req.url)
    const clientPageId = searchParams.get('pageId')
    const clientPageToken = searchParams.get('pageAccessToken')

    const clientTokens = clientPageId && clientPageToken
      ? { pageId: clientPageId, pageAccessToken: clientPageToken }
      : undefined

    const ctx = await getAuthorizedContext(req, clientTokens)
    if ('error' in ctx) return ctx.error

    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(ctx.pageId)}/leadgen_forms?fields=id,name,created_time&limit=100`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${ctx.pageAccessToken}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errJson: unknown = await res.json().catch(() => ({}))
      const msg = (errJson && typeof errJson === 'object' && errJson !== null && (errJson as { error?: { message?: string } }).error?.message)
        || 'Failed to list forms'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const json: unknown = await res.json()
    const list = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
      ? (json as { data: Array<{ id?: string; name?: string; created_time?: string }> }).data
      : []
    const forms: LeadFormSummary[] = list
      .filter((f) => typeof f.id === 'string')
      .map((f) => ({ id: f.id as string, name: f.name, created_time: f.created_time }))

    return NextResponse.json({ forms })
  } catch (error) {
    console.error('[MetaForms] GET error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const b = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as {
          name?: string
          privacyPolicy?: { url?: string; link_text?: string }
          questions?: Array<{ type?: string }>
          thankYouPage?: { title?: string; body?: string; button_text?: string; button_type?: string; button_url?: string }
          pageId?: string
          pageAccessToken?: string
        })
      : {}

    // Extract optional client tokens from body (fallback for localStorage)
    const clientTokens = b.pageId && b.pageAccessToken
      ? { pageId: b.pageId, pageAccessToken: b.pageAccessToken }
      : undefined

    const ctx = await getAuthorizedContext(req, clientTokens)
    if ('error' in ctx) return ctx.error

    const name = typeof b.name === 'string' && b.name.trim().length > 0 ? b.name.trim() : ''
    const privacyPolicy = (b.privacyPolicy && typeof b.privacyPolicy === 'object') ? b.privacyPolicy : {}
    const questions = Array.isArray(b.questions) ? b.questions : []
    const thankYouPage = (b.thankYouPage && typeof b.thankYouPage === 'object') ? b.thankYouPage : {}

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const ppUrl = typeof privacyPolicy.url === 'string' ? privacyPolicy.url : ''
    const ppText = typeof privacyPolicy.link_text === 'string' ? privacyPolicy.link_text : ''
    if (!ppUrl || !ppText) return NextResponse.json({ error: 'privacyPolicy.url and privacyPolicy.link_text required' }, { status: 400 })

    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(ctx.pageId)}/leadgen_forms`

    const payload = new URLSearchParams()
    payload.set('name', name)
    payload.set('privacy_policy', JSON.stringify({ url: ppUrl, link_text: ppText }))
    if (questions.length > 0) payload.set('questions', JSON.stringify(questions))
    if (Object.keys(thankYouPage).length > 0) payload.set('thank_you_page', JSON.stringify(thankYouPage))

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.pageAccessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    })

    const out: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (out && typeof out === 'object' && out !== null && (out as { error?: { message?: string } }).error?.message)
        || 'Failed to create form'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const id = (out && typeof out === 'object' && out !== null && typeof (out as { id?: string }).id === 'string')
      ? (out as { id: string }).id
      : ''
    if (!id) return NextResponse.json({ error: 'No id returned from Graph' }, { status: 502 })

    return NextResponse.json({ id })
  } catch (error) {
    console.error('[MetaForms] POST error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


