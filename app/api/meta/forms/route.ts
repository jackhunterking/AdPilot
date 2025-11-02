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
  console.log('[MetaForms getAuthorizedContext] Starting authorization')

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId')

  console.log('[MetaForms getAuthorizedContext] Request params:', {
    campaignId,
    hasClientTokens: !!clientTokens,
    clientPageId: clientTokens?.pageId,
    hasClientPageAccessToken: !!clientTokens?.pageAccessToken,
    clientPageAccessTokenLength: clientTokens?.pageAccessToken?.length,
  })

  if (!campaignId) {
    console.error('[MetaForms getAuthorizedContext] Missing campaignId')
    return { error: NextResponse.json({ error: 'campaignId required' }, { status: 400 }) }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[MetaForms getAuthorizedContext] Not authenticated')
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  console.log('[MetaForms getAuthorizedContext] User authenticated:', { userId: user.id })

  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select('id,user_id')
    .eq('id', campaignId)
    .maybeSingle()

  console.log('[MetaForms getAuthorizedContext] Campaign lookup:', {
    campaignId,
    found: !!campaign,
    userIdMatch: campaign?.user_id === user.id,
  })

  if (!campaign || campaign.user_id !== user.id) {
    console.error('[MetaForms getAuthorizedContext] Campaign not found or unauthorized')
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  // 1. Try Supabase first (existing behavior)
  console.log('[MetaForms getAuthorizedContext] Checking Supabase for connection')
  const conn = await getConnectionWithToken({ campaignId })

  console.log('[MetaForms getAuthorizedContext] Supabase connection result:', {
    hasConn: !!conn,
    hasSelectedPageId: !!conn?.selected_page_id,
    hasSelectedPageAccessToken: !!conn?.selected_page_access_token,
    hasLongLivedUserToken: !!conn?.long_lived_user_token,
    selectedPageId: conn?.selected_page_id,
  })

  let pageId: string = ''
  let pageAccessToken: string = ''
  let longToken: string = ''
  let source: 'supabase' | 'localStorage' | 'derived' = 'supabase'

  if (conn?.selected_page_id && conn?.long_lived_user_token) {
    console.log('[MetaForms getAuthorizedContext] Supabase has data - using it')
    // Supabase has data - use it
    pageId = conn.selected_page_id
    longToken = conn.long_lived_user_token

    // Try to get page access token from stored value or derive it
    if (conn.selected_page_access_token) {
      console.log('[MetaForms getAuthorizedContext] Using stored page access token from Supabase')
      pageAccessToken = conn.selected_page_access_token
      source = 'supabase'
    } else {
      console.log('[MetaForms getAuthorizedContext] No stored page token - deriving from long-lived token')
      // Derive from long-lived token
      const pages = await fetchPagesWithTokens({ token: longToken })
      console.log('[MetaForms getAuthorizedContext] Fetched pages:', {
        count: pages.length,
        pageIds: pages.map(p => p.id),
      })
      const match = pages.find(p => p.id === pageId) || null
      pageAccessToken = match?.access_token || ''
      source = pageAccessToken ? 'derived' : 'supabase'
      console.log('[MetaForms getAuthorizedContext] Derive result:', {
        found: !!match,
        hasToken: !!pageAccessToken,
        source,
      })
    }
  } else {
    console.log('[MetaForms getAuthorizedContext] Supabase empty - attempting localStorage fallback')
    // 2. Supabase empty - fall back to client-provided tokens
    if (clientTokens?.pageId && clientTokens?.pageAccessToken) {
      console.log('[MetaForms getAuthorizedContext] Using client-provided tokens from localStorage')
      pageId = clientTokens.pageId
      pageAccessToken = clientTokens.pageAccessToken
      longToken = conn?.long_lived_user_token || '' // May still be in Supabase
      source = 'localStorage'

      console.log('[MetaForms getAuthorizedContext] localStorage fallback successful:', {
        campaignId,
        pageId,
        hasToken: !!pageAccessToken,
        tokenLength: pageAccessToken.length,
      })
    } else {
      console.error('[MetaForms getAuthorizedContext] No client tokens provided for fallback')
    }
  }

  // 3. Validate we have what we need
  if (!pageId || !pageAccessToken) {
    console.error('[MetaForms getAuthorizedContext] Final validation FAILED - missing tokens:', {
      campaignId,
      hasSupabaseConn: !!conn,
      supabaseConnKeys: conn ? Object.keys(conn) : [],
      hasClientTokens: !!(clientTokens?.pageId && clientTokens?.pageAccessToken),
      clientTokensKeys: clientTokens ? Object.keys(clientTokens) : [],
      finalPageId: pageId,
      finalPageIdExists: !!pageId,
      finalPageAccessToken: !!pageAccessToken,
      finalPageAccessTokenLength: pageAccessToken?.length || 0,
      source,
    })
    return {
      error: NextResponse.json({
        error: 'No Meta connection found. Please connect Meta first.',
        details: 'Missing page ID or access token'
      }, { status: 400 })
    }
  }

  console.log('[MetaForms getAuthorizedContext] Authorization SUCCESS - using tokens from:', source, {
    campaignId,
    pageId,
    hasLongToken: !!longToken,
    pageAccessTokenLength: pageAccessToken.length,
    pageAccessTokenPreview: pageAccessToken.slice(0, 6) + '...' + pageAccessToken.slice(-4),
  })

  return { userId: user.id, campaignId, pageId, longToken, pageAccessToken, source }
}

export async function GET(req: NextRequest) {
  console.log('[MetaForms GET] Request received')

  try {
    // Extract optional client tokens from query params (fallback for localStorage)
    const { searchParams } = new URL(req.url)
    const clientPageId = searchParams.get('pageId')
    const clientPageToken = searchParams.get('pageAccessToken')

    console.log('[MetaForms GET] Query params:', {
      hasPageId: !!clientPageId,
      pageId: clientPageId,
      hasPageAccessToken: !!clientPageToken,
      pageAccessTokenLength: clientPageToken?.length,
    })

    const clientTokens = clientPageId && clientPageToken
      ? { pageId: clientPageId, pageAccessToken: clientPageToken }
      : undefined

    console.log('[MetaForms GET] Client tokens for fallback:', {
      hasClientTokens: !!clientTokens,
    })

    const ctx = await getAuthorizedContext(req, clientTokens)
    if ('error' in ctx) {
      console.error('[MetaForms GET] Authorization failed')
      return ctx.error
    }

    console.log('[MetaForms GET] Authorization successful:', {
      source: ctx.source,
      pageId: ctx.pageId,
    })

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
  console.log('[MetaForms POST] Request received')
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    console.log('[MetaForms POST] Body parsed:', {
      hasBody: !!bodyUnknown,
      bodyKeys: bodyUnknown && typeof bodyUnknown === 'object' ? Object.keys(bodyUnknown) : [],
    })
    const b = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as {
          campaignId?: string
          name?: string
          privacyPolicy?: { url?: string; link_text?: string }
          questions?: Array<{ type?: string }>
          thankYouPage?: { title?: string; body?: string; button_text?: string; button_type?: string; website_url?: string }
          pageId?: string
          pageAccessToken?: string
        })
      : {}

    console.log('[MetaForms POST] Extracted from body:', {
      hasName: !!b.name,
      hasPrivacyPolicy: !!b.privacyPolicy,
      hasQuestions: Array.isArray(b.questions),
      hasThankYouPage: !!b.thankYouPage,
      hasPageId: !!b.pageId,
      pageId: b.pageId,
      hasPageAccessToken: !!b.pageAccessToken,
      pageAccessTokenLength: b.pageAccessToken?.length,
    })

    // Extract optional client tokens from body (fallback for localStorage)
    const clientTokens = b.pageId && b.pageAccessToken
      ? { pageId: b.pageId, pageAccessToken: b.pageAccessToken }
      : undefined

    console.log('[MetaForms POST] Client tokens for fallback:', {
      hasClientTokens: !!clientTokens,
      pageId: clientTokens?.pageId,
      hasPageAccessToken: !!clientTokens?.pageAccessToken,
      pageAccessTokenLength: clientTokens?.pageAccessToken?.length,
    })

    // Derive campaignId from query or body (backward compatible)
    const queryCampaignId = new URL(req.url).searchParams.get('campaignId') || ''
    const bodyCampaignId = typeof b.campaignId === 'string' ? b.campaignId : ''
    const derivedCampaignId = queryCampaignId || bodyCampaignId
    if (!derivedCampaignId) {
      return NextResponse.json({ error: 'campaignId required (query or body)' }, { status: 400 })
    }

    // Ensure getAuthorizedContext sees campaignId in the URL (it reads search params)
    const u = new URL(req.url)
    u.searchParams.set('campaignId', derivedCampaignId)
    const reqWithCampaign = new NextRequest(u.toString(), { headers: req.headers })

    const ctx = await getAuthorizedContext(reqWithCampaign, clientTokens)
    if ('error' in ctx) {
      console.error('[MetaForms POST] Authorization failed, returning error')
      return ctx.error
    }

    console.log('[MetaForms POST] Authorization successful, proceeding with form creation:', {
      source: ctx.source,
      pageId: ctx.pageId,
      hasPageAccessToken: !!ctx.pageAccessToken,
    })

    const name = typeof b.name === 'string' && b.name.trim().length > 0 ? b.name.trim() : ''
    const privacyPolicy = (b.privacyPolicy && typeof b.privacyPolicy === 'object') ? b.privacyPolicy : {}
    const questions = Array.isArray(b.questions) ? b.questions : []
    const thankYouPageRaw = (b.thankYouPage && typeof b.thankYouPage === 'object') ? b.thankYouPage : {}
    const thankYouPage = (() => {
      const t: Record<string, unknown> = { ...thankYouPageRaw }
      // Sanitize legacy key if present
      if ((t as { button_url?: string }).button_url && !(t as { website_url?: string }).website_url) {
        t.website_url = (t as { button_url?: string }).button_url
        delete (t as { button_url?: string }).button_url
      }
      return t
    })()

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


