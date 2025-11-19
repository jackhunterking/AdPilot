/**
 * Feature: Meta Instant Forms Detail (v1)
 * Purpose: Return detail for a specific Instant Form
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Facebook Graph API leadgen_form: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, ValidationError } from '@/app/api/v1/_middleware'
import { getConnectionWithToken, fetchPagesWithTokens, getGraphVersion } from '@/lib/meta/service'
import { GraphAPILeadgenFormSchema } from '@/lib/meta/instant-form-schemas'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('[GET /api/v1/meta/instant-forms/[id]] Request received')

  try {
    const user = await requireAuth(req)
    
    const { id: formId } = await params
    if (!formId) {
      throw new ValidationError('Form id required')
    }

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      throw new ValidationError('campaignId required')
    }

    // Extract optional client tokens from query params (fallback for localStorage)
    const clientPageId = searchParams.get('pageId')
    const clientPageToken = searchParams.get('pageAccessToken')

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    // Get access tokens
    const conn = await getConnectionWithToken({ campaignId })

    let pageId: string = ''
    let pageAccessToken: string = ''
    let source: 'supabase' | 'localStorage' | 'derived' = 'supabase'

    if (conn?.selected_page_id && conn?.long_lived_user_token) {
      pageId = conn.selected_page_id

      if (conn.selected_page_access_token) {
        pageAccessToken = conn.selected_page_access_token
        source = 'supabase'
      } else {
        const pages = await fetchPagesWithTokens({ token: conn.long_lived_user_token })
        const match = pages.find(p => p.id === pageId) || null
        pageAccessToken = match?.access_token || ''
        source = pageAccessToken ? 'derived' : 'supabase'
      }
    } else if (clientPageId && clientPageToken) {
      pageId = clientPageId
      pageAccessToken = clientPageToken
      source = 'localStorage'
    }

    if (!pageId || !pageAccessToken) {
      console.error('[MetaInstantForms] Missing tokens:', {
        campaignId,
        formId,
        pageId: !!pageId,
        pageAccessToken: !!pageAccessToken,
      })
      return NextResponse.json({
        error: 'No Meta connection found. Please connect Meta first.',
        details: 'Missing page ID or access token'
      }, { status: 400 })
    }

    console.log('[MetaInstantForms] Using tokens from:', source)

    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(formId)}?fields=id,name,questions{type,key,label},thank_you_page{title,body,button_text,website_url}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: 'no-store',
    })

    const json: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errorObj = json && typeof json === 'object' && json !== null ? json as { error?: { message?: string; code?: number } } : null
      const errorMessage = errorObj?.error?.message || 'Failed to load form detail'
      const errorCode = errorObj?.error?.code
      
      if (errorCode === 100) {
        return NextResponse.json({
          error: 'Form data format not supported. This form may be using an older format.',
          details: errorMessage,
        }, { status: 502 })
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 502 })
    }

    const parseResult = GraphAPILeadgenFormSchema.safeParse(json)
    if (!parseResult.success) {
      console.error('[MetaInstantForms] Invalid response:', parseResult.error.issues)
      return NextResponse.json({
        error: 'Invalid form data received from Meta',
        details: parseResult.error.issues,
      }, { status: 502 })
    }

    return NextResponse.json(parseResult.data)
  } catch (error) {
    console.error('[GET /api/v1/meta/instant-forms/[id]] Error:', error)
    return errorResponse(error as Error)
  }
}

