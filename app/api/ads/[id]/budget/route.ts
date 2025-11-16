/**
 * Feature: Ad Budget API
 * Purpose: CRUD operations for ad budget configuration
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/supabase/database.types'

// GET /api/ads/[id]/budget - Fetch budget for an ad
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this ad
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('campaign_id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || (ad.campaigns as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch budget
    const { data: budget, error } = await supabaseServer
      .from('ad_budgets')
      .select('*')
      .eq('ad_id', adId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is okay
      console.error('Error fetching budget:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ budget: budget || null })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 })
  }
}

// PUT /api/ads/[id]/budget - Update budget (upsert)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params
    const body = await request.json()

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this ad
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('campaign_id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || (ad.campaigns as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate required fields
    if (!body.dailyBudgetCents || body.dailyBudgetCents <= 0) {
      return NextResponse.json(
        { error: 'dailyBudgetCents must be positive' },
        { status: 400 }
      )
    }

    // Build budget data
    const budgetData: TablesInsert<'ad_budgets'> = {
      ad_id: adId,
      daily_budget_cents: body.dailyBudgetCents,
      currency_code: body.currencyCode || 'USD',
      start_date: body.startDate || null,
      end_date: body.endDate || null,
      timezone: body.timezone || 'America/New_York'
    }

    // Upsert budget
    const { data: budget, error } = await supabaseServer
      .from('ad_budgets')
      .upsert(budgetData, { onConflict: 'ad_id' })
      .select()
      .single()

    if (error) {
      console.error('Error upserting budget:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
  }
}

