/**
 * Feature: CRM Webhook Configuration
 * Purpose: Store webhook endpoint, secret, and event preferences for lead delivery.
 * References:
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { getWebhookConfig, upsertWebhookConfig } from '@/lib/meta/leads'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface WebhookBody {
  campaignId?: string
  webhookUrl?: string
  secretKey?: string | null
  events?: string[]
  active?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const body = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as WebhookBody)
      : {}

    const campaignId = typeof body.campaignId === 'string' && body.campaignId.trim().length > 0
      ? body.campaignId.trim()
      : null

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
      console.error('[MetaWebhook] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await upsertWebhookConfig(campaignId, {
      webhookUrl: body.webhookUrl ?? '',
      secretKey: body.secretKey ?? null,
      events: Array.isArray(body.events) ? body.events : undefined,
      active: typeof body.active === 'boolean' ? body.active : undefined,
    })

    const config = await getWebhookConfig(campaignId)
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('[MetaWebhook] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to save webhook configuration'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
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
      console.error('[MetaWebhook] Campaign lookup failed (GET):', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await getWebhookConfig(campaignId)
    return NextResponse.json({ config })
  } catch (error) {
    console.error('[MetaWebhook] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to load webhook configuration'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
