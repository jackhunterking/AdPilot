/**
 * Feature: Ads API v1
 * Purpose: List and create ads (flat structure with campaignId filter)
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { CreateAdRequest, ListAdsResponse } from '@/lib/types/api'
import type { Json } from '@/lib/supabase/database.types'

// ============================================================================
// Type Guards
// ============================================================================

function isCreateAdRequest(body: unknown): body is CreateAdRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    'name' in b && typeof b.name === 'string' &&
    'campaignId' in b && typeof b.campaignId === 'string' &&
    (!('status' in b) || typeof b.status === 'string')
  )
}

// ============================================================================
// GET /api/v1/ads - List ads for a campaign
// Query params: ?campaignId=xxx (required), ?status=draft (optional)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const statusFilter = searchParams.get('status')

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'campaignId query parameter is required' } },
        { status: 400 }
      )
    }

    // Verify campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Campaign not found' } },
        { status: 404 }
      )
    }

    // Fetch ads
    let query = supabaseServer
      .from('ads')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter as 'draft' | 'active' | 'paused')
    }

    const { data: ads, error } = await query

    if (error) {
      console.error('[v1/ads] GET error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: 'Failed to fetch ads' } },
        { status: 500 }
      )
    }

    const response: ListAdsResponse = {
      ads: ads || []
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('[v1/ads] GET unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/v1/ads - Create new ad
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body: unknown = await request.json()
    if (!isCreateAdRequest(body)) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'Invalid request body' } },
        { status: 400 }
      )
    }

    const { campaignId, name, status = 'draft', creative_data, copy_data, setup_snapshot } = body

    // Verify campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Campaign not found or access denied' } },
        { status: 403 }
      )
    }

    // Create ad
    const { data: ad, error } = await supabaseServer
      .from('ads')
      .insert({
        campaign_id: campaignId,
        name,
        creative_data: (creative_data as Json) || null,
        copy_data: (copy_data as Json) || null,
        setup_snapshot: (setup_snapshot as Json) || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[v1/ads] POST error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'creation_failed', message: 'Failed to create ad' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: { ad } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[v1/ads] POST unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

