/**
 * Feature: Ad Copy API
 * Purpose: CRUD operations for ad copy variations
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/supabase/database.types'

// GET /api/ads/[id]/copy - Fetch all copy variations for an ad
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this ad
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('campaign_id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || (ad.campaigns as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch copy variations
    const { data: copyVariations, error } = await supabaseServer
      .from('ad_copy_variations')
      .select('*')
      .eq('ad_id', adId)
      .order('sort_order')

    if (error) {
      console.error('Error fetching copy variations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ copyVariations: copyVariations || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch copy' }, { status: 500 })
  }
}

// POST /api/ads/[id]/copy - Add new copy variation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params
    const body = await request.json()

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this ad
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('campaign_id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || (ad.campaigns as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate required fields
    if (!body.headline || !body.primaryText || !body.ctaText) {
      return NextResponse.json(
        { error: 'Missing required fields: headline, primaryText, ctaText' },
        { status: 400 }
      )
    }

    // Insert copy variation
    const copyData: TablesInsert<'ad_copy_variations'> = {
      ad_id: adId,
      headline: body.headline,
      primary_text: body.primaryText,
      description: body.description || null,
      cta_text: body.ctaText,
      cta_type: body.ctaType || null,
      overlay_headline: body.overlayHeadline || null,
      overlay_offer: body.overlayOffer || null,
      overlay_body: body.overlayBody || null,
      overlay_density: body.overlayDensity || null,
      is_selected: body.isSelected || false,
      sort_order: body.sortOrder || 0,
      generation_prompt: body.generationPrompt || null
    }

    const { data: copyVariation, error } = await supabaseServer
      .from('ad_copy_variations')
      .insert(copyData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting copy variation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ copyVariation }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to create copy variation' }, { status: 500 })
  }
}

// PATCH /api/ads/[id]/copy - Update selected copy
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params
    const { selectedCopyId } = await request.json()

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this ad
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('campaign_id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || (ad.campaigns as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Unselect all copy variations for this ad
    await supabaseServer
      .from('ad_copy_variations')
      .update({ is_selected: false })
      .eq('ad_id', adId)

    // Select the specified one
    await supabaseServer
      .from('ad_copy_variations')
      .update({ is_selected: true })
      .eq('id', selectedCopyId)

    // Update selected_copy_id on ads table
    await supabaseServer
      .from('ads')
      .update({ selected_copy_id: selectedCopyId })
      .eq('id', adId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to update selected copy' }, { status: 500 })
  }
}

// DELETE /api/ads/[id]/copy - Delete a copy variation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params
    const { searchParams } = new URL(request.url)
    const copyId = searchParams.get('copyId')

    if (!copyId) {
      return NextResponse.json({ error: 'copyId query parameter required' }, { status: 400 })
    }

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this ad
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('campaign_id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || (ad.campaigns as unknown as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete copy variation
    const { error } = await supabaseServer
      .from('ad_copy_variations')
      .delete()
      .eq('id', copyId)
      .eq('ad_id', adId)

    if (error) {
      console.error('Error deleting copy variation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to delete copy variation' }, { status: 500 })
  }
}

