/**
 * Feature: Launch Preview API
 * Purpose: Prepare confirmation data for launch modal
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { LaunchConfirmationData } from '@/lib/types/meta-integration'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError) throw campaignError

    // Fetch Meta connection
    const { data: connection, error: connError } = await supabase
      .from('campaign_meta_connections')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (connError && connError.code !== 'PGRST116') {
      throw connError
    }

    // Fetch budget allocations with ad names
    const { data: allocations, error: allocError } = await supabase
      .from('budget_allocations')
      .select(`
        *,
        ads:ad_id (id, name)
      `)
      .eq('campaign_id', campaignId)

    if (allocError) throw allocError

    // Build confirmation data
    const metaConnection: import('@/lib/types/meta-integration').MetaConnectionSummary = {
      status: (connection?.connection_status ?? 'disconnected') as import('@/lib/types/meta-integration').MetaConnectionStatus,
      paymentStatus: (connection?.payment_status ?? 'unknown') as import('@/lib/types/meta-integration').PaymentStatus,
      business: connection?.selected_business_id
        ? {
            id: connection.selected_business_id,
            name: connection.selected_business_name ?? undefined,
          }
        : undefined,
      page: connection?.selected_page_id
        ? {
            id: connection.selected_page_id,
            name: connection.selected_page_name ?? undefined,
          }
        : undefined,
      instagram: connection?.selected_ig_user_id
        ? {
            id: connection.selected_ig_user_id,
            username: connection.selected_ig_username ?? undefined,
          }
        : null,
      adAccount: connection?.selected_ad_account_id
        ? {
            id: connection.selected_ad_account_id,
            name: connection.selected_ad_account_name ?? undefined,
          }
        : undefined,
      lastVerifiedAt: connection?.last_verified_at ?? undefined,
    }

    const campaignBudget: import('@/lib/types/meta-integration').CampaignBudget = {
      campaignId,
      totalBudget: campaign.campaign_budget || 0,
      strategy: (campaign.budget_strategy as import('@/lib/types/meta-integration').BudgetStrategy) || 'ai_distribute',
      status: (campaign.budget_status as import('@/lib/types/meta-integration').BudgetStatus) || 'draft',
      allocations: (allocations || []).map(alloc => ({
        adId: alloc.ad_id,
        adName: (alloc.ads as unknown as { name: string })?.name || 'Unnamed Ad',
        recommendedBudget: alloc.recommended_budget,
        reasonCode: alloc.reason_code || 'unknown',
        confidenceScore: alloc.confidence_score || 0,
        actualSpend: alloc.actual_spend || 0,
      })),
    }

    // Check blockers
    const blockers: string[] = []
    
    if (metaConnection.status !== 'connected') {
      blockers.push('Meta connection not established')
    }
    
    if (metaConnection.paymentStatus !== 'verified') {
      blockers.push('Payment method not verified')
    }
    
    if (!campaign.campaign_budget || campaign.campaign_budget < 10) {
      blockers.push('Campaign budget not set (minimum $10)')
    }

    const canLaunch = blockers.length === 0

    const confirmationData: LaunchConfirmationData = {
      campaignBudget,
      metaConnection,
      canLaunch,
      blockers,
    }

    return NextResponse.json(confirmationData)

  } catch (error) {
    console.error('[Launch Preview]', error)
    return NextResponse.json(
      { error: 'Failed to prepare launch preview' },
      { status: 500 }
    )
  }
}

