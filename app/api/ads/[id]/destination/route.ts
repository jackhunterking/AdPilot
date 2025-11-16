/**
 * Feature: Ad Destination API
 * Purpose: CRUD operations for ad destination configuration
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/supabase/database.types'

// GET /api/ads/[id]/destination - Fetch destination for an ad
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

    // Fetch destination
    const { data: destination, error } = await supabaseServer
      .from('ad_destinations')
      .select('*')
      .eq('ad_id', adId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is okay
      console.error('Error fetching destination:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ destination: destination || null })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch destination' }, { status: 500 })
  }
}

// PUT /api/ads/[id]/destination - Update destination (upsert)
export async function PUT(
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
    if (!body.destinationType) {
      return NextResponse.json(
        { error: 'destinationType is required' },
        { status: 400 }
      )
    }

    // Build destination data
    const destinationData: TablesInsert<'ad_destinations'> = {
      ad_id: adId,
      destination_type: body.destinationType,
      instant_form_id: body.instantFormId || null,
      website_url: body.websiteUrl || null,
      display_link: body.displayLink || null,
      utm_params: body.utmParams || null,
      phone_number: body.phoneNumber || null,
      phone_country_code: body.phoneCountryCode || null,
      phone_formatted: body.phoneFormatted || null
    }

    // Upsert destination
    const { data: destination, error } = await supabaseServer
      .from('ad_destinations')
      .upsert(destinationData, { onConflict: 'ad_id' })
      .select()
      .single()

    if (error) {
      console.error('Error upserting destination:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update destination_type on ads table for backward compatibility
    await supabaseServer
      .from('ads')
      .update({ destination_type: body.destinationType })
      .eq('id', adId)

    return NextResponse.json({ destination })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to update destination' }, { status: 500 })
  }
}

