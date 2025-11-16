/**
 * Feature: Ad Creative API
 * Purpose: CRUD operations for ad creatives (feed/story/reel formats)
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/supabase/database.types'

// GET /api/ads/[id]/creative - Fetch all creatives for an ad
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

    // Get format filter from query params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    // Fetch creatives
    let query = supabaseServer
      .from('ad_creatives')
      .select('*')
      .eq('ad_id', adId)

    if (format) {
      query = query.eq('creative_format', format)
    }

    const { data: creatives, error } = await query.order('sort_order')

    if (error) {
      console.error('Error fetching creatives:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ creatives: creatives || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch creatives' }, { status: 500 })
  }
}

// POST /api/ads/[id]/creative - Add new creative variation
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
    if (!body.imageUrl || !body.format) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, format' },
        { status: 400 }
      )
    }

    // Insert creative
    const creativeData: TablesInsert<'ad_creatives'> = {
      ad_id: adId,
      creative_format: body.format,
      image_url: body.imageUrl,
      creative_style: body.style || null,
      variation_label: body.label || null,
      gradient_class: body.gradientClass || null,
      is_base_image: body.isBaseImage || false,
      sort_order: body.sortOrder || 0
    }

    const { data: creative, error } = await supabaseServer
      .from('ad_creatives')
      .insert(creativeData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting creative:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ creative }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to create creative' }, { status: 500 })
  }
}

// PATCH /api/ads/[id]/creative - Update selected creative
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params
    const { selectedCreativeId } = await request.json()

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

    // Update selected creative
    const { error } = await supabaseServer
      .from('ads')
      .update({ selected_creative_id: selectedCreativeId })
      .eq('id', adId)

    if (error) {
      console.error('Error updating selected creative:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to update selected creative' }, { status: 500 })
  }
}

