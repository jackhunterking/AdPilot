/**
 * Feature: Resume Published Campaign
 * Purpose: Resume Meta campaign delivery for a user-owned campaign.
 * References:
 *  - Meta Campaign Status Updates: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group#Updating
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { resumePublishedCampaign } from '@/lib/meta/publisher'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface ResumeRequestBody {
  campaignId?: string
}

function getCampaignId(req: NextRequest, body: ResumeRequestBody): string | null {
  const queryId = new URL(req.url).searchParams.get('campaignId')
  if (queryId) return queryId
  if (typeof body.campaignId === 'string' && body.campaignId.trim().length > 0) {
    return body.campaignId.trim()
  }
  return null
}

export async function PATCH(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const body = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as ResumeRequestBody)
      : {}

    const campaignId = getCampaignId(req, body)
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      console.error('[MetaResume] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = await resumePublishedCampaign(campaignId)
    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('[MetaResume] PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Failed to resume campaign'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
