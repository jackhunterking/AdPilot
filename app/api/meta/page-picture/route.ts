/**
 * Feature: Meta Page Profile Picture Fetcher
 * Purpose: Fetch page profile picture URL from Facebook Graph API
 * References:
 *  - Meta Graph API Page Picture: https://developers.facebook.com/docs/graph-api/reference/profile-picture-source/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, fetchPagesWithTokens, getGraphVersion } from '@/lib/meta/service'

export async function GET(req: NextRequest) {
  console.log('[MetaPagePicture GET] Request received')

  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const pageId = searchParams.get('pageId')
    const clientPageToken = searchParams.get('pageAccessToken')

    if (!campaignId || !pageId) {
      return NextResponse.json(
        { error: 'Missing campaignId or pageId' },
        { status: 400 }
      )
    }

    console.log('[MetaPagePicture GET] Params:', {
      campaignId,
      pageId,
      hasClientToken: !!clientPageToken,
    })

    // 1. Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Get access token (try Supabase first, then client-provided)
    let pageAccessToken: string = ''
    let source: 'supabase' | 'localStorage' | 'derived' = 'supabase'

    const conn = await getConnectionWithToken({ campaignId })

    if (conn?.selected_page_id && conn?.long_lived_user_token) {
      // Supabase has data - use it
      // Try to get page access token from stored value or derive it
      if (conn.selected_page_access_token) {
        pageAccessToken = conn.selected_page_access_token
        source = 'supabase'
      } else {
        // Derive from long-lived token
        const pages = await fetchPagesWithTokens({ token: conn.long_lived_user_token })
        const match = pages.find(p => p.id === conn.selected_page_id) || null
        pageAccessToken = match?.access_token || ''
        source = pageAccessToken ? 'derived' : 'supabase'
      }
    } else {
      // Supabase empty - fall back to client-provided tokens
      if (clientPageToken) {
        pageAccessToken = clientPageToken
        source = 'localStorage'
      }
    }

    if (!pageAccessToken) {
      console.error('[MetaPagePicture GET] No access token found')
      return NextResponse.json(
        {
          error: 'No Meta connection found',
          pictureUrl: null,
        },
        { status: 400 }
      )
    }

    console.log('[MetaPagePicture GET] Token resolved from:', source)

    // 4. Fetch profile picture from Graph API
    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(
      pageId
    )}/picture?type=large&redirect=false`

    console.log('[MetaPagePicture GET] Fetching from Graph API:', {
      endpoint: url,
      pageId,
    })

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: 'no-store',
    })

    const json: unknown = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg =
        (json &&
          typeof json === 'object' &&
          json !== null &&
          (json as { error?: { message?: string } }).error?.message) ||
        'Failed to fetch profile picture'
      console.error('[MetaPagePicture GET] API error:', msg)
      return NextResponse.json(
        {
          error: msg,
          pictureUrl: null,
        },
        { status: 502 }
      )
    }

    // Extract picture URL from response
    const pictureUrl =
      json &&
      typeof json === 'object' &&
      json !== null &&
      'data' in json &&
      typeof json.data === 'object' &&
      json.data !== null &&
      'url' in json.data &&
      typeof json.data.url === 'string'
        ? json.data.url
        : null

    console.log('[MetaPagePicture GET] Success:', {
      hasPictureUrl: !!pictureUrl,
    })

    return NextResponse.json({ pictureUrl })
  } catch (error) {
    console.error('[MetaPagePicture GET] Error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        error: 'Server error',
        pictureUrl: null,
      },
      { status: 500 }
    )
  }
}

