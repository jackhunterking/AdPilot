/**
 * Feature: Lead Export API v1
 * Purpose: Export leads as CSV or JSON with filtering and sorting
 * References:
 *  - Meta Lead Retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - Supabase Auth: https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'
import { formatLeadsAsCsv, type LeadRecord } from '@/lib/meta/leads'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

function buildFilename(format: 'csv' | 'json', campaignId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `campaign-${campaignId}-leads-${timestamp}.${format}`
}

function parseSortOrder(param: string | null): 'asc' | 'desc' {
  return param === 'asc' ? 'asc' : 'desc'
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    const formatParam = (url.searchParams.get('format') || 'csv').toLowerCase()

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'campaignId required' } },
        { status: 400 }
      )
    }

    const format = formatParam === 'json' ? 'json' : 'csv'
    const search = url.searchParams.get('search') || ''
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const sortBy = url.searchParams.get('sortBy') || 'submitted_at'
    const sortOrder = parseSortOrder(url.searchParams.get('sortOrder'))

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) {
      console.error('[v1/leads/export] Campaign lookup failed:', campaignError)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: 'Failed to load campaign' } },
        { status: 500 }
      )
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Campaign not found or access denied' } },
        { status: 403 }
      )
    }

    let query = supabaseServer
      .from('lead_form_submissions')
      .select('*')
      .eq('campaign_id', campaignId)

    if (dateFrom) query = query.gte('submitted_at', dateFrom)
    if (dateTo) query = query.lte('submitted_at', dateTo)

    if (['submitted_at', 'created_at', 'meta_lead_id'].includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('submitted_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('[v1/leads/export] Query error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: 'Failed to load leads' } },
        { status: 500 }
      )
    }

    const leads: LeadRecord[] = (data ?? []).map((row) => ({
      id: row.id,
      campaign_id: row.campaign_id,
      meta_lead_id: row.meta_lead_id,
      meta_form_id: row.meta_form_id,
      submitted_at: row.submitted_at,
      created_at: row.created_at,
      exported_at: row.exported_at,
      webhook_sent: row.webhook_sent,
      webhook_sent_at: row.webhook_sent_at,
      form_data:
        row.form_data && typeof row.form_data === 'object' && !Array.isArray(row.form_data)
          ? (row.form_data as Record<string, Json>)
          : null,
    }))

    let filteredLeads = leads
    if (search && search.trim().length > 0) {
      const searchLower = search.toLowerCase()
      filteredLeads = leads.filter((lead) => {
        if (lead.meta_lead_id.toLowerCase().includes(searchLower)) return true
        if (lead.form_data) {
          return Object.values(lead.form_data).some((value) => {
            return typeof value === 'string' && value.toLowerCase().includes(searchLower)
          })
        }
        return false
      })
    }

    if (filteredLeads.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'no_data', message: 'No leads found matching the criteria' } },
        { status: 404 }
      )
    }

    if (format === 'csv') {
      const csvContent = formatLeadsAsCsv(filteredLeads)
      const filename = buildFilename('csv', campaignId)
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const filename = buildFilename('json', campaignId)
    return new NextResponse(JSON.stringify(filteredLeads, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[v1/leads/export] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to export leads'
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message } },
      { status: 500 }
    )
  }
}
