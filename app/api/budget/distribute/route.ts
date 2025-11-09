/**
 * Feature: Budget Distribution API
 * Purpose: AI-driven budget allocation across campaign ads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { BudgetAllocation, CampaignBudget } from '@/lib/types/meta-integration'

const AllocationSchema = z.object({
  allocations: z.array(z.object({
    adId: z.string(),
    adName: z.string(),
    recommendedBudget: z.number(),
    reasonCode: z.string(),
    confidenceScore: z.number().min(0).max(1),
  })),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, totalBudget, strategy = 'ai_distribute' } = body

    if (!campaignId || !totalBudget || totalBudget < 10) {
      return NextResponse.json({ error: 'Invalid budget parameters' }, { status: 400 })
    }

    // Fetch campaign ads
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('id, name, status, metrics_snapshot')
      .eq('campaign_id', campaignId)

    if (adsError) throw adsError

    if (!ads || ads.length === 0) {
      // No ads yet - return empty allocations
      const budget: CampaignBudget = {
        campaignId,
        totalBudget,
        strategy,
        status: 'draft',
        allocations: [],
      }

      return NextResponse.json({ success: true, budget, distributedAt: new Date().toISOString() })
    }

    // AI-driven distribution using Vercel AI SDK
    let allocations: BudgetAllocation[] = []

    if (strategy === 'ai_distribute') {
      // Use AI SDK to generate optimal distribution
      const { object } = await generateObject({
        model: openai('gpt-4-turbo'),
        schema: AllocationSchema,
        prompt: `
          You are a Meta ads budget optimization expert. Distribute a total budget of $${totalBudget} across the following ads.
          
          Ads:
          ${ads.map(ad => `- ${ad.name} (Status: ${ad.status}, Metrics: ${JSON.stringify(ad.metrics_snapshot || {})})`).join('\n')}
          
          Rules:
          - Minimum $5 per ad
          - Prioritize ads with better CTR, lower CPC, or in learning phase
          - Provide a reason code (e.g., "high_ctr", "learning_phase", "new_ad", "underperforming")
          - Assign confidence score 0-1
          - Total must equal exactly $${totalBudget}
        `,
      })

      allocations = object.allocations.map(alloc => ({
        ...alloc,
        actualSpend: 0,
      }))
    } else if (strategy === 'equal_split') {
      // Equal distribution
      const perAd = totalBudget / ads.length
      allocations = ads.map(ad => ({
        adId: ad.id,
        adName: ad.name,
        recommendedBudget: perAd,
        reasonCode: 'equal_split',
        confidenceScore: 1.0,
        actualSpend: 0,
      }))
    }

    // Save allocations to budget_allocations table
    const allocationRecords = allocations.map(alloc => ({
      campaign_id: campaignId,
      ad_id: alloc.adId,
      recommended_budget: alloc.recommendedBudget,
      reason_code: alloc.reasonCode,
      confidence_score: alloc.confidenceScore,
      actual_spend: 0,
      status: 'pending',
    }))

    await supabase
      .from('budget_allocations')
      .upsert(allocationRecords, { onConflict: 'campaign_id,ad_id' })

    // Update campaign budget
    await supabase
      .from('campaigns')
      .update({
        campaign_budget: totalBudget,
        budget_strategy: strategy,
        budget_status: 'draft',
      })
      .eq('id', campaignId)

    const budget: CampaignBudget = {
      campaignId,
      totalBudget,
      strategy,
      status: 'draft',
      allocations,
      lastDistributedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      budget,
      distributedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[Budget Distribution]', error)
    return NextResponse.json(
      { error: 'Failed to distribute budget' },
      { status: 500 }
    )
  }
}

