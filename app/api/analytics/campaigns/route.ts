/**
 * Feature: Campaign Analytics API
 * Purpose: Cross-campaign analytics and budget analysis
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

// GET /api/analytics/campaigns - Get analytics across campaigns
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch campaigns with ads and budgets
    const { data: campaigns, error } = await supabaseServer
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        initial_goal,
        campaign_budget_cents,
        currency_code,
        budget_status,
        created_at,
        updated_at,
        ads (
          id,
          name,
          status,
          ad_budgets (
            daily_budget_cents,
            currency_code
          ),
          ad_creatives (count),
          ad_copy_variations (count),
          ad_target_locations (count)
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaign analytics:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate analytics for each campaign
    const analytics = (campaigns || []).map(campaign => {
      const campaignData = campaign as {
        id: string
        name: string
        status: string | null
        initial_goal: string | null
        campaign_budget_cents: number | null
        currency_code: string
        budget_status: string | null
        created_at: string | null
        updated_at: string | null
        ads: Array<{
          id: string
          name: string
          status: string
          ad_budgets: { daily_budget_cents: number; currency_code: string } | null
          ad_creatives: Array<unknown>
          ad_copy_variations: Array<unknown>
          ad_target_locations: Array<unknown>
        }>
      }

      const totalAllocated = campaignData.ads.reduce((sum, ad) => {
        const adBudget = ad.ad_budgets?.daily_budget_cents || 0
        return sum + adBudget
      }, 0)

      const adCount = campaignData.ads.length
      const activeAdCount = campaignData.ads.filter(ad => ad.status === 'active').length
      const draftAdCount = campaignData.ads.filter(ad => ad.status === 'draft').length

      return {
        campaign_id: campaignData.id,
        campaign_name: campaignData.name,
        campaign_status: campaignData.status,
        goal_type: campaignData.initial_goal,
        total_budget: campaignData.campaign_budget_cents ? campaignData.campaign_budget_cents / 100 : 0,
        allocated_budget: totalAllocated / 100,
        remaining_budget: campaignData.campaign_budget_cents 
          ? (campaignData.campaign_budget_cents - totalAllocated) / 100 
          : 0,
        currency: campaignData.currency_code,
        budget_status: campaignData.budget_status,
        ad_count: adCount,
        active_ads: activeAdCount,
        draft_ads: draftAdCount,
        created_at: campaignData.created_at,
        updated_at: campaignData.updated_at
      }
    })

    // Calculate global totals
    const totals = {
      total_campaigns: analytics.length,
      total_budget: analytics.reduce((sum, a) => sum + a.total_budget, 0),
      total_allocated: analytics.reduce((sum, a) => sum + a.allocated_budget, 0),
      total_ads: analytics.reduce((sum, a) => sum + a.ad_count, 0),
      total_active_ads: analytics.reduce((sum, a) => sum + a.active_ads, 0)
    }

    return NextResponse.json({ analytics, totals })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

