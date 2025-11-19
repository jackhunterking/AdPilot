/**
 * Feature: Lead Listing with Pagination, Sorting, and Filtering (v1)
 * Purpose: Return stored Meta lead form submissions for the campaign owner
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Meta Lead Retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *  - Supabase Pagination: https://supabase.com/docs/reference/javascript/using-pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCampaignOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { supabaseServer } from '@/lib/supabase/server'
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
    const user = await requireAuth(req)
    
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    
    if (!campaignId) {
      throw new ValidationError('campaignId query parameter required')
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

    // Verify campaign ownership
    await requireCampaignOwnership(campaignId, user.id)

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

    // Apply sorting
    if (['submitted_at', 'created_at', 'meta_lead_id'].includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('submitted_at', { ascending: false })
    }

    // Get total count
    const { count: totalCount } = await query

    // Apply pagination
    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    const { data, error } = await query

    if (error) {
      console.error('[GET /api/v1/leads] Query error:', error)
      throw new Error('Failed to load leads')
    }

    const leads = (data ?? []) as LeadRecord[]

    // Apply client-side search filtering (on form_data)
    let filteredLeads = leads
    if (search) {
      const lowerSearch = search.toLowerCase()
      filteredLeads = leads.filter(lead => {
        const formDataStr = JSON.stringify(lead.form_data).toLowerCase()
        return formDataStr.includes(lowerSearch) || 
               lead.meta_lead_id?.toLowerCase().includes(lowerSearch)
      })
    }

    return successResponse(
      { leads: filteredLeads },
      {
        pagination: {
          page,
          pageSize,
          totalItems: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / pageSize)
        }
      }
    )
  } catch (error) {
    console.error('[GET /api/v1/leads] Error:', error)
    return errorResponse(error as Error)
  }
}
