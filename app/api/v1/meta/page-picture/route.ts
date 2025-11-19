/**
 * Feature: Meta Page Profile Picture Fetcher (v1)
 * Purpose: Fetch page profile picture URL from Facebook Graph API
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Graph API Page Picture: https://developers.facebook.com/docs/graph-api/reference/profile-picture-source/
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { getConnectionWithToken, fetchPagesWithTokens, getGraphVersion } from '@/lib/meta/service'

export async function GET(req: NextRequest) {
  console.log('[GET /api/v1/meta/page-picture] Request received')

  try {
    const user = await requireAuth(req)
    
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const pageId = searchParams.get('pageId')
    const clientPageToken = searchParams.get('pageAccessToken')

    if (!campaignId || !pageId) {
      throw new ValidationError('Missing campaignId or pageId')
    }

    console.log('[MetaPagePicture] Params:', {
      campaignId,
      pageId,
      hasClientToken: !!clientPageToken,
    })

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    // Get access token (try Supabase first, then client-provided)
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
      console.error('[MetaPagePicture] No access token found')
      return successResponse({
        pictureUrl: null,
      })
    }

    console.log('[MetaPagePicture] Token resolved from:', source)

    // Fetch profile picture from Graph API
    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(
      pageId
    )}/picture?type=large&redirect=false`

    console.log('[MetaPagePicture] Fetching from Graph API:', {
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
      console.error('[MetaPagePicture] API error:', msg)
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

    console.log('[MetaPagePicture] Success:', {
      hasPictureUrl: !!pictureUrl,
    })

    return successResponse({ pictureUrl })
  } catch (error) {
    console.error('[GET /api/v1/meta/page-picture] Error:', error)
    return errorResponse(error as Error)
  }
}

