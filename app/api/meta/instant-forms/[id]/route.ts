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
import { GraphAPILeadgenFormSchema } from '@/lib/meta/instant-form-schemas'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('[MetaInstantForms GET] Request received')

  try {
    const { id: formId } = await params
    if (!formId) {
      console.error('[MetaInstantForms GET] Missing form ID')
      return NextResponse.json({ error: 'Form id required' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      console.error('[MetaInstantForms GET] Missing campaignId')
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    // Extract optional client tokens from query params (fallback for localStorage)
    const clientPageId = searchParams.get('pageId')
    const clientPageToken = searchParams.get('pageAccessToken')

    console.log('[MetaInstantForms GET] Request params:', {
      formId,
      campaignId,
      hasClientPageId: !!clientPageId,
      clientPageId,
      hasClientPageToken: !!clientPageToken,
      clientPageTokenLength: clientPageToken?.length,
    })

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

    console.log('[MetaInstantForms GET] Token resolution SUCCESS - using tokens from:', source, {
      campaignId,
      formId,
      pageId,
      pageAccessTokenLength: pageAccessToken.length,
      pageAccessTokenPreview: pageAccessToken.slice(0, 6) + '...' + pageAccessToken.slice(-4),
    })

    const gv = getGraphVersion()
    // Note: privacy_policy field removed from query to avoid errors with older forms
    // Privacy policy will be set to defaults in the mapper if missing
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(formId)}?fields=id,name,questions{type,key,label},thank_you_page{title,body,button_text,website_url}`

    console.log('[MetaInstantForms GET] Calling Meta Graph API:', {
      endpoint: url.replace(/access_token=[^&]+/, 'access_token=[REDACTED]'),
      formId,
    })
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: 'no-store',
    })

    const json: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errorObj = json && typeof json === 'object' && json !== null ? json as { error?: { message?: string; code?: number; type?: string } } : null
      const errorMessage = errorObj?.error?.message || 'Failed to load form detail'
      const errorCode = errorObj?.error?.code
      const errorType = errorObj?.error?.type
      
      console.error('[MetaInstantForms GET] Graph API error:', {
        status: res.status,
        errorMessage,
        errorCode,
        errorType,
        formId,
      })
      
      // Provide more helpful error messages
      if (errorCode === 100) {
        return NextResponse.json({
          error: 'Form data format not supported. This form may be using an older format.',
          details: errorMessage,
        }, { status: 502 })
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 502 })
    }

    // Validate with zod schema
    const parseResult = GraphAPILeadgenFormSchema.safeParse(json)
    if (!parseResult.success) {
      console.error('[MetaInstantForms GET] Invalid response from Graph API:', {
        formId,
        errors: parseResult.error.issues,
        responseData: json,
      })
      return NextResponse.json({
        error: 'Invalid form data received from Meta',
        details: parseResult.error.issues,
      }, { status: 502 })
    }
    
    console.log('[MetaInstantForms GET] Successfully fetched form:', {
      formId: parseResult.data.id,
      hasQuestions: Array.isArray(parseResult.data.questions) && parseResult.data.questions.length > 0,
      hasPrivacyPolicy: !!parseResult.data.privacy_policy,
      hasThankYouPage: !!parseResult.data.thank_you_page,
    })

    return NextResponse.json(parseResult.data)
  } catch (error) {
    console.error('[MetaInstantFormDetail] GET error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


