/**
 * Feature: A/B Test API
 * Purpose: Create, manage, and monitor A/B tests for campaign variants
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs/guides/database/joins
 * 
 * NOTE: This is a simulated A/B test flow for UX demonstration
 * TODO: Wire in actual Meta API calls for real A/B testing
 */

import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ABTest, ABTestStatus } from '@/lib/types/workspace'
import type { Json } from '@/lib/supabase/database.types'

// GET /api/campaigns/[id]/ab-test - Get active A/B test for campaign
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { id: campaignId } = await context.params

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
      .select('id, user_id, campaign_states(*)')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check for active A/B test in campaign_states (stored in publish_data)
    const states = campaign.campaign_states as { publish_data?: { ab_test?: ABTest } } | null
    const abTest = states?.publish_data?.ab_test

    if (!abTest) {
      return NextResponse.json({ ab_test: null })
    }

    return NextResponse.json({ ab_test: abTest })
  } catch (error) {
    console.error('[API] A/B Test GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns/[id]/ab-test - Create new A/B test
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { id: campaignId } = await context.params
    const body = await request.json()

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

    // Extract A/B test configuration
    const {
      test_type,
      variant_a_id,
      variant_b_id,
      test_config,
      start_immediately = true,
    } = body as {
      test_type: string
      variant_a_id: string
      variant_b_id: string
      test_config: ABTest['test_config']
      start_immediately?: boolean
    }

    if (!test_type || !variant_a_id || !variant_b_id || !test_config) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify both variants exist and belong to this campaign
    const { data: variants, error: variantsError } = await supabase
      .from('ads')
      .select('id')
      .in('id', [variant_a_id, variant_b_id])
      .eq('campaign_id', campaignId)

    if (variantsError || !variants || variants.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid variant IDs' },
        { status: 400 }
      )
    }

    // Create A/B test object
    const abTest: ABTest = {
      id: crypto.randomUUID(),
      campaign_id: campaignId,
      test_type: test_type as ABTest['test_type'],
      test_config,
      variant_a_id,
      variant_b_id,
      status: start_immediately ? 'active' : 'setup',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(start_immediately && { started_at: new Date().toISOString() }),
    }

    // Store in campaign_states (in publish_data field)
    const { error: updateError } = await supabase
      .from('campaign_states')
      .update({
        publish_data: {
          ab_test: abTest as unknown as Json,
        } as unknown as Json,
      })
      .eq('campaign_id', campaignId)

    if (updateError) {
      console.error('[API] Error storing A/B test:', updateError)
      return NextResponse.json(
        { error: 'Failed to create A/B test' },
        { status: 500 }
      )
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({
        published_status: 'ab_test_active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    return NextResponse.json({ ab_test: abTest }, { status: 201 })
  } catch (error) {
    console.error('[API] A/B Test POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/campaigns/[id]/ab-test - Update A/B test (stop, declare winner)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { id: campaignId } = await context.params
    const body = await request.json()

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current A/B test
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id, campaign_states(*)')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const states = campaign.campaign_states as { publish_data?: { ab_test?: ABTest } } | null
    const currentTest = states?.publish_data?.ab_test

    if (!currentTest) {
      return NextResponse.json(
        { error: 'No active A/B test found' },
        { status: 404 }
      )
    }

    // Extract update action
    const { action, winner_variant_id, results } = body as {
      action: 'stop' | 'complete' | 'declare_winner'
      winner_variant_id?: string
      results?: ABTest['results']
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action field' },
        { status: 400 }
      )
    }

    // Update A/B test based on action
    const updatedTest: ABTest = {
      ...currentTest,
      updated_at: new Date().toISOString(),
    }

    if (action === 'stop' || action === 'complete') {
      updatedTest.status = action === 'stop' ? 'stopped' : 'completed'
      updatedTest.completed_at = new Date().toISOString()
    }

    if (action === 'declare_winner' && winner_variant_id) {
      updatedTest.winner_variant_id = winner_variant_id
      updatedTest.status = 'completed'
      updatedTest.completed_at = new Date().toISOString()
    }

    if (results) {
      updatedTest.results = results
    }

    // Store updated test (in publish_data field)
    const { error: updateError } = await supabase
      .from('campaign_states')
      .update({
        publish_data: {
          ab_test: updatedTest as unknown as Json,
        } as unknown as Json,
      })
      .eq('campaign_id', campaignId)

    if (updateError) {
      console.error('[API] Error updating A/B test:', updateError)
      return NextResponse.json(
        { error: 'Failed to update A/B test' },
        { status: 500 }
      )
    }

    // Update campaign status if test completed
    if (updatedTest.status === 'completed' || updatedTest.status === 'stopped') {
      await supabase
        .from('campaigns')
        .update({
          published_status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
    }

    return NextResponse.json({ ab_test: updatedTest })
  } catch (error) {
    console.error('[API] A/B Test PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

