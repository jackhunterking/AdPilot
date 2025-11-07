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
    if (dailyBudget === null || Number.isNaN(dailyBudget)) {
      return NextResponse.json({ error: 'dailyBudget required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', id)
      .maybeSingle()

    if (campaignError) {
      console.error('[BudgetUpdate] Campaign lookup failed:', campaignError)
      return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
    }

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await updateBudgetAndSchedule({
      campaignId: id,
      dailyBudget,
      startTime: body.startTime ?? null,
      endTime: body.endTime ?? null,
    })

    return NextResponse.json({ success: true, budget: result })
  } catch (error) {
    console.error('[BudgetUpdate] PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update budget'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
