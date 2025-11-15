/**
 * Feature: Campaign State API v1
 * Purpose: Get and update campaign wizard state
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 *  - Supabase JSONB: https://supabase.com/docs/guides/database/json
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { stateManager } from '@/lib/services/state-manager'
import type { Json } from '@/lib/supabase/database.types'

// ============================================================================
// GET /api/v1/campaigns/[id]/state - Get campaign state
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaignId = id

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden - You do not own this campaign' } },
        { status: 403 }
      )
    }

    // Get campaign state
    const { data, error } = await supabaseServer
      .from('campaign_states')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (error) {
      console.error('[v1/campaigns/:id/state] GET error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { state: data }
    })
  } catch (error) {
    console.error('[v1/campaigns/:id/state] GET unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to fetch campaign state' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/v1/campaigns/[id]/state - Update campaign state
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaignId = id
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden - You do not own this campaign' } },
        { status: 403 }
      )
    }
    
    const body = (await request.json()) as Record<string, unknown>
    
    // Validate that at least one field is being updated
    const validFields = [
      'goal_data',
      'location_data',
      'ad_copy_data',
      'ad_preview_data',
      'budget_data',
      'generated_images',
      // Allow meta connect state to be persisted via the standard state API
      'meta_connect_data',
    ]
    
    const updateData: Record<string, Json | null> = {}
    for (const field of validFields) {
      if (field in body) {
        updateData[field] = body[field] as Json | null
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'No valid fields to update' } },
        { status: 400 }
      )
    }

    // Update campaign state using state-manager service
    await stateManager.updateMultipleFields(campaignId, updateData)

    // Get updated state
    const state = await stateManager.getCampaignState(campaignId)

    // Also update the campaign's updated_at timestamp
    await supabaseServer
      .from('campaigns')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', campaignId)

    return NextResponse.json({
      success: true,
      data: { state }
    })
  } catch (error) {
    console.error('[v1/campaigns/:id/state] PATCH unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Failed to update campaign state' } },
      { status: 500 }
    )
  }
}

