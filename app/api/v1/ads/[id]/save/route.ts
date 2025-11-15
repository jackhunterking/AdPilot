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
      .select('id, setup_snapshot, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || ad.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    // Parse snapshot from request body
    const body: unknown = await req.json()
    
    // Save snapshot
    const { data: updated, error } = await supabaseServer
      .from('ads')
      .update({ 
        setup_snapshot: body as Json,
        updated_at: new Date().toISOString() 
      })
      .eq('id', adId)
      .select()
      .single()

    if (error) {
      console.error('[v1/ads/:id/save] Error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'save_failed', message: 'Failed to save snapshot' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ad: updated }
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
      .select('id, setup_snapshot, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || ad.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { snapshot: ad.setup_snapshot }
    })
  } catch (error) {
    console.error('[v1/ads/:id/save] GET unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

