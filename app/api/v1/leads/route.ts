/**
 * Feature: Leads API v1
 * Purpose: List and manage Meta lead form submissions
 * References:
 *  - Meta Lead Retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - Supabase Auth: https://supabase.com/docs/reference/javascript/auth-getuser
 *  - Supabase Pagination: https://supabase.com/docs/reference/javascript/using-pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { LeadsListParams, ListLeadsResponse } from '@/lib/types/api'
import type { Json } from '@/lib/supabase/database.types'

function parseIntParam(param: string | null, defaultValue: number): number {
  if (!param) return defaultValue
  const parsed = parseInt(param, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
}

function parseSortOrder(param: string | null): 'asc' | 'desc' {
  return param === 'asc' ? 'asc' : 'desc'
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'campaignId required' } },
        { status: 400 }
      )
    }

    const page = parseIntParam(url.searchParams.get('page'), 1)
    const pageSize = parseIntParam(url.searchParams.get('pageSize'), 20)
    const sortBy = url.searchParams.get('sortBy') || 'submitted_at'
    const sortOrder = parseSortOrder(url.searchParams.get('sortOrder'))
    const search = url.searchParams.get('search') || ''
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

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
      console.error('[v1/leads] Campaign lookup failed:', campaignError)
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
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId)

    if (dateFrom) {
      query = query.gte('submitted_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('submitted_at', dateTo)
    }

    if (['submitted_at', 'created_at', 'meta_lead_id'].includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('submitted_at', { ascending: false })
    }

    const { count: totalCount } = await query

    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    const { data, error } = await query

    if (error) {
      console.error('[v1/leads] Query error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: 'Failed to load leads' } },
        { status: 500 }
      )
    }

    const leads = (data ?? []).map((row) => ({
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
            if (typeof value === 'string') {
              return value.toLowerCase().includes(searchLower)
            }
            return false
          })
        }
        return false
      })
    }

    const columnSet = new Set<string>()
    filteredLeads.forEach((lead) => {
      if (lead.form_data) {
        Object.keys(lead.form_data).forEach((key) => columnSet.add(key))
      }
    })
    const columns = Array.from(columnSet)

    const totalPages = Math.ceil((totalCount ?? 0) / pageSize)

    const response: ListLeadsResponse = {
      leads: filteredLeads,
      columns,
    }

    return NextResponse.json(
      {
        success: true,
        data: response,
        meta: {
          pagination: {
            page,
            pageSize,
            totalItems: totalCount ?? 0,
            totalPages,
          },
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store', // Real-time data
        },
      }
    )
  } catch (error) {
    console.error('[v1/leads] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to load leads'
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message } },
      { status: 500 }
    )
  }
}
