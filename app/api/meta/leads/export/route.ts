/**
 * Feature: Lead Export
 * Purpose: Download stored lead submissions in CSV or JSON.
 * References:
 *  - Meta Lead Retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { formatLeadsAsCsv, getStoredLeads } from '@/lib/meta/leads'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

function buildFilename(format: 'csv' | 'json', campaignId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `campaign-${campaignId}-leads-${timestamp}.${format}`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    const formatParam = (url.searchParams.get('format') || 'csv').toLowerCase()

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const format = formatParam === 'json' ? 'json' : 'csv'

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
      console.error('[MetaLeadsExport] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const leads = await getStoredLeads(campaignId)

    if (format === 'json') {
      const body = JSON.stringify({ leads }, null, 2)
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${buildFilename('json', campaignId)}"`,
        },
      })
    }

    const csv = formatLeadsAsCsv(leads)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${buildFilename('csv', campaignId)}"`,
      },
    })
  } catch (error) {
    console.error('[MetaLeadsExport] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to export leads'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
