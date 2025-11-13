/**
 * Feature: Lead Listing with Pagination, Sorting, and Filtering
 * Purpose: Return stored Meta lead form submissions for the campaign owner with advanced table features.
 * References:
 *  - Meta Lead Retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 *  - Supabase Pagination: https://supabase.com/docs/reference/javascript/using-pagination
 */

import { NextRequest, NextResponse } from 'next/server'

import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { LeadRecord } from '@/lib/meta/leads'
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
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    // Parse pagination parameters
    const page = parseIntParam(url.searchParams.get('page'), 1)
    const pageSize = parseIntParam(url.searchParams.get('pageSize'), 20)
    
    // Parse sorting parameters
    const sortBy = url.searchParams.get('sortBy') || 'submitted_at'
    const sortOrder = parseSortOrder(url.searchParams.get('sortOrder'))
    
    // Parse filtering parameters
    const search = url.searchParams.get('search') || ''
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

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
      console.error('[MetaLeads] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build query with filters
    let query = supabaseServer
      .from('lead_form_submissions')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId)

    // Apply date range filters
    if (dateFrom) {
      query = query.gte('submitted_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('submitted_at', dateTo)
    }

    // Apply sorting (only on top-level columns, not form_data)
    if (['submitted_at', 'created_at', 'meta_lead_id'].includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      // Default sort by submitted_at if trying to sort by form_data field
      query = query.order('submitted_at', { ascending: false })
    }

    // Get total count first
    const { count: totalCount } = await query

    // Apply pagination
    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    const { data, error } = await query

    if (error) {
      console.error('[MetaLeads] Query error:', error)
      return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
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

    // Client-side search filter (since we can't easily search JSONB fields in query)
    let filteredLeads = leads
    if (search && search.trim().length > 0) {
      const searchLower = search.toLowerCase()
      filteredLeads = leads.filter((lead) => {
        // Search in meta_lead_id
        if (lead.meta_lead_id.toLowerCase().includes(searchLower)) {
          return true
        }
        // Search in form_data values
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

    // Extract dynamic columns from form_data
    const columnSet = new Set<string>()
    filteredLeads.forEach((lead) => {
      if (lead.form_data) {
        Object.keys(lead.form_data).forEach((key) => columnSet.add(key))
      }
    })
    const columns = Array.from(columnSet)

    const totalPages = Math.ceil((totalCount ?? 0) / pageSize)

    return NextResponse.json({
      data: filteredLeads,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: totalCount ?? 0,
        totalPages,
      },
      columns,
    })
  } catch (error) {
    console.error('[MetaLeads] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to load leads'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
