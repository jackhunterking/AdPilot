/**
 * Feature: Publish Campaign
 * Purpose: Create Campaign → AdSet → Ads via Meta Marketing API for a user-owned campaign.
 * References:
 *  - Meta Campaign Creation: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
 *  - Meta Ad Set Creation: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign
 *  - Meta Ad Creation: https://developers.facebook.com/docs/marketing-api/reference/ad
 *  - Supabase Server Auth: https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { publishCampaign, getPublishStatus } from '@/lib/meta/publisher'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface PublishRequestBody {
  campaignId?: string
}

function extractCampaignId(req: NextRequest, body: PublishRequestBody): string | null {
  const queryCampaignId = new URL(req.url).searchParams.get('campaignId')
  if (queryCampaignId) return queryCampaignId
  if (typeof body.campaignId === 'string' && body.campaignId.trim().length > 0) {
    return body.campaignId.trim()
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const body = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as PublishRequestBody)
      : {}

    const campaignId = extractCampaignId(req, body)
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
      console.error('[MetaPublish] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const publishResult = await publishCampaign({ campaignId, userId: user.id })
    const status = await getPublishStatus(campaignId)

    return NextResponse.json({
      success: true,
      publishResult,
      status,
    })
  } catch (error) {
    console.error('[MetaPublish] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to publish campaign'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
