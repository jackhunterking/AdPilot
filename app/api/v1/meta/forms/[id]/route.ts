/**
 * Feature: Meta Form Detail API v1
 * Purpose: Get details for a specific Meta Instant Form
 * References:
 *  - Facebook leadgen_form: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, getGraphVersion } from '@/lib/meta/service'
import { GraphAPILeadgenFormSchema } from '@/lib/meta/instant-form-schemas'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: formId } = await params

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
    const pageAccessToken = conn?.selected_page_access_token

    if (!pageAccessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'not_connected', message: 'Meta page not connected' } },
        { status: 400 }
      )
    }

    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(formId)}?fields=id,name,questions{type,key,label},thank_you_page{title,body,button_text,website_url}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: 'no-store',
    })

    const json: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const errorObj = json && typeof json === 'object' && json !== null ? json as { error?: { message?: string } } : null
      const errorMessage = errorObj?.error?.message || 'Failed to load form'
      
      return NextResponse.json(
        { success: false, error: { code: 'meta_api_error', message: errorMessage } },
        { status: 502 }
      )
    }

    const parseResult = GraphAPILeadgenFormSchema.safeParse(json)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid_response', message: 'Invalid form data', details: parseResult.error.issues } },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      data: parseResult.data
    })
  } catch (error) {
    console.error('[v1/meta/forms/:id] GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Server error' } },
      { status: 500 }
    )
  }
}
