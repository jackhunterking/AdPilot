/**
 * Feature: Lead Export with Filtering and Sorting (v1)
 * Purpose: Download stored lead submissions in CSV or JSON
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Lead Retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, ValidationError } from '@/app/api/v1/_middleware'
import { formatLeadsAsCsv, type LeadRecord } from '@/lib/meta/leads'
import { supabaseServer } from '@/lib/supabase/server'
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
    const user = await requireAuth(req)
    
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    const formatParam = (url.searchParams.get('format') || 'csv').toLowerCase()

    if (!campaignId) {
      throw new ValidationError('campaignId query parameter required')
    }

    const format = formatParam === 'json' ? 'json' : 'csv'
    
    // Parse filtering parameters
    const search = url.searchParams.get('search') || ''
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const sortBy = url.searchParams.get('sortBy') || 'submitted_at'
    const sortOrder = parseSortOrder(url.searchParams.get('sortOrder'))

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

    // Build query with filters
    let query = supabaseServer
      .from('lead_form_submissions')
      .select('*')
      .eq('campaign_id', campaignId)

    // Apply date range filters
    if (dateFrom) {
      query = query.gte('submitted_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('submitted_at', dateTo)
    }

    // Apply sorting
    if (['submitted_at', 'created_at', 'meta_lead_id'].includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('submitted_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('[GET /api/v1/leads/export] Query error:', error)
      throw new Error('Failed to load leads')
    }

    const leads = (data ?? []) as LeadRecord[]

    // Apply client-side search filtering
    let filteredLeads = leads
    if (search) {
      const lowerSearch = search.toLowerCase()
      filteredLeads = leads.filter(lead => {
        const formDataStr = JSON.stringify(lead.form_data).toLowerCase()
        return formDataStr.includes(lowerSearch) || 
               lead.meta_lead_id?.toLowerCase().includes(lowerSearch)
      })
    }

    // Mark as exported
    if (filteredLeads.length > 0) {
      await supabaseServer
        .from('lead_form_submissions')
        .update({ exported_at: new Date().toISOString() })
        .in('id', filteredLeads.map(l => l.id))
    }

    const filename = buildFilename(format, campaignId)

    if (format === 'csv') {
      const csv = formatLeadsAsCsv(filteredLeads)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      return new NextResponse(JSON.stringify(filteredLeads, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }
  } catch (error) {
    console.error('[GET /api/v1/leads/export] Error:', error)
    return errorResponse(error as Error)
  }
}

