/**
 * Feature: Save/Snapshot Ad API v1
 * Purpose: Save ad snapshot and retrieve it
 * References:
 *  - Supabase JSONB: https://supabase.com/docs/guides/database/json
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

// POST - Save snapshot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Get ad with campaign to verify ownership
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || ad.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    // Parse snapshot from request body
    await req.json()
    
    // NOTE: This v1 API is deprecated. setup_snapshot column was removed in backend refactoring.
    // Ad data is now stored in normalized tables (ad_creatives, ad_copy_variations, etc.)
    // This endpoint now returns success without saving for backward compatibility.
    // Use the v2 APIs for saving ad data to normalized tables.

    return NextResponse.json({
      success: true,
      data: { ad: { id: ad.id } },
      warning: 'This v1 API is deprecated. Use v2 APIs for saving ad data.'
    })
  } catch (error) {
    console.error('[v1/ads/:id/save] POST unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// GET - Retrieve snapshot
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Get ad with campaign to verify ownership
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || ad.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    // Return null snapshot (setup_snapshot column removed in backend refactoring)
    return NextResponse.json({
      success: true,
      data: { snapshot: null },
      warning: 'This v1 API is deprecated. Use v2 APIs for fetching ad data.'
    })
  } catch (error) {
    console.error('[v1/ads/:id/save] GET unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

