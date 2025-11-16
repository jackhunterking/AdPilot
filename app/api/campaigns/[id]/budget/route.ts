/**
 * Feature: Budget Editor
 * Purpose: Allow post-launch updates to daily budget and schedule.
 * References:
 *  - Meta Ad Set Update: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#Updating
 *  - Supabase Auth (Server): https://supabase.com/docs/reference/javascript/auth-getuser
 */

import { NextRequest, NextResponse } from 'next/server'

import { updateBudgetAndSchedule } from '@/lib/meta/updater'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface BudgetBody {
  dailyBudget?: number
  startTime?: string | null
  endTime?: string | null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const bodyUnknown: unknown = await req.json().catch(() => ({}))
    const body = (bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null)
      ? (bodyUnknown as BudgetBody)
      : {}

    const dailyBudget = typeof body.dailyBudget === 'number' ? body.dailyBudget : null
    if (dailyBudget === null || Number.isNaN(dailyBudget) || dailyBudget <= 0) {
      return NextResponse.json({ error: 'dailyBudget required and must be greater than 0' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id,published_status')
      .eq('id', id)
      .maybeSingle()

    if (campaignError) {
      console.error('[BudgetUpdate] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate total budget for storage
    const totalBudget = dailyBudget * 30

    // Check if campaign is published - if so, update Meta as well
    const isPublished = campaign.published_status === 'active' || campaign.published_status === 'paused'
    
    if (isPublished) {
      // For published campaigns, update Meta and sync back to database
      const result = await updateBudgetAndSchedule({
        campaignId: id,
        dailyBudget,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
      })
      
      // Also update campaign_budget in campaigns table
      await supabaseServer
        .from('campaigns')
        .update({ campaign_budget: totalBudget })
        .eq('id', id)
      
      return NextResponse.json({ success: true, budget: result })
    } else {
      // For unpublished campaigns, just update the database
      const { error: updateError } = await supabaseServer
        .from('campaigns')
        .update({ campaign_budget: totalBudget })
        .eq('id', id)
      
      if (updateError) {
        console.error('[BudgetUpdate] Database update failed:', updateError)
        return NextResponse.json({ error: 'Failed to update campaign budget' }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        budget: { dailyBudget, totalBudget } 
      })
    }
  } catch (error) {
    console.error('[BudgetUpdate] PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update budget'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
