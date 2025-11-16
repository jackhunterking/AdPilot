/**
 * Feature: Ad Search API
 * Purpose: Search and filter ads by location, budget, creative style, etc.
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

// GET /api/ads/search - Search ads with filters
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Build query with filters
    let query = supabaseServer
      .from('ads')
      .select(`
        *,
        campaigns!inner(user_id),
        ad_creatives!ad_creatives_ad_id_fkey (*),
        ad_copy_variations!ad_copy_variations_ad_id_fkey (*),
        ad_target_locations!ad_target_locations_ad_id_fkey (*),
        ad_destinations!ad_destinations_ad_id_fkey (*),
        ad_budgets!ad_budgets_ad_id_fkey (*)
      `)
      .eq('campaigns.user_id', user.id)

    // Filter by campaign ID
    const campaignId = searchParams.get('campaign_id')
    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    // Filter by status
    const status = searchParams.get('status')
    const validStatuses = ['draft', 'pending_review', 'active', 'paused', 'rejected', 'failed', 'learning', 'archived'] as const
    if (status && validStatuses.includes(status as typeof validStatuses[number])) {
      query = query.eq('status', status as typeof validStatuses[number])
    }

    // Filter by location (requires join)
    const location = searchParams.get('location')
    if (location) {
      // Note: This requires the location to match via join
      query = query.ilike('ad_target_locations.location_name', `%${location}%`)
    }

    // Filter by minimum budget
    const budgetMin = searchParams.get('budget_min')
    if (budgetMin) {
      const budgetCents = Number(budgetMin) * 100
      query = query.gte('ad_budgets.daily_budget_cents', budgetCents)
    }

    // Filter by maximum budget
    const budgetMax = searchParams.get('budget_max')
    if (budgetMax) {
      const budgetCents = Number(budgetMax) * 100
      query = query.lte('ad_budgets.daily_budget_cents', budgetCents)
    }

    // Filter by creative style
    const creativeStyle = searchParams.get('creative_style')
    if (creativeStyle) {
      query = query.eq('ad_creatives.creative_style', creativeStyle)
    }

    // Filter by creative format
    const creativeFormat = searchParams.get('creative_format')
    if (creativeFormat) {
      query = query.eq('ad_creatives.creative_format', creativeFormat)
    }

    // Execute query
    const { data: ads, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching ads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ads: ads || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to search ads' }, { status: 500 })
  }
}

