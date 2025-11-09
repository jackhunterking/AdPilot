/**
 * Feature: Campaign Metrics API
 * Purpose: Fetch real-time metrics for ads and variants
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/database/joins
 * 
 * NOTE: This returns simulated metrics for now
 * TODO: Wire in actual Meta API calls to fetch real metrics from Meta Ads Manager
 */

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AdMetrics } from '@/lib/types/workspace'
import type { Json } from '@/lib/supabase/database.types'

// GET /api/campaigns/[id]/metrics?variant_id=xxx - Get metrics for a specific variant
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { id: campaignId } = await context.params
    const { searchParams } = new URL(request.url)
    const variantId = searchParams.get('variant_id')

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (!variantId) {
      return NextResponse.json(
        { error: 'variant_id query parameter required' },
        { status: 400 }
      )
    }

    // Get the ad/variant
    const { data: ad, error: adError } = await supabase
      .from('ads')
      .select('*')
      .eq('id', variantId)
      .eq('campaign_id', campaignId)
      .single()

    if (adError || !ad) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      )
    }

    // Check if we have cached metrics
    if (ad.metrics_snapshot) {
      const cachedMetrics = ad.metrics_snapshot as unknown as AdMetrics
      return NextResponse.json({ metrics: cachedMetrics })
    }

    // Generate simulated metrics for demonstration
    // TODO: Replace with actual Meta API call
    const simulatedMetrics: AdMetrics = generateSimulatedMetrics(ad.status)

    // Cache metrics in database
    await supabase
      .from('ads')
      .update({
        metrics_snapshot: simulatedMetrics as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', variantId)

    return NextResponse.json({ metrics: simulatedMetrics })
  } catch (error) {
    console.error('[API] Metrics GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate simulated metrics
// TODO: Remove this when integrating with actual Meta API
function generateSimulatedMetrics(status: string): AdMetrics {
  const isActive = status === 'active'
  
  // Generate realistic-looking numbers
  const impressions = isActive ? Math.floor(Math.random() * 5000) + 1000 : 0
  const reach = Math.floor(impressions * 0.8)
  const clicks = Math.floor(impressions * 0.03) // ~3% CTR
  const leads = Math.floor(clicks * 0.1) // ~10% conversion rate
  const spend = clicks * 0.75 // $0.75 average CPC
  
  return {
    impressions,
    reach,
    clicks,
    leads,
    cpc: clicks > 0 ? spend / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpl: leads > 0 ? spend / leads : 0,
    spend,
    last_updated: new Date().toISOString(),
  }
}

