/**
 * Feature: Ad Locations API
 * Purpose: CRUD operations for ad location targeting
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/supabase/database.types'

// GET /api/ads/[id]/locations - Fetch all locations for an ad
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

    // Fetch locations
    const { data: locations, error } = await supabaseServer
      .from('ad_target_locations')
      .select('*')
      .eq('ad_id', adId)
      .order('created_at')

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ locations: locations || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}

// POST /api/ads/[id]/locations - Add location(s) to ad
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

    // Support both single location and array of locations
    const locationsArray = Array.isArray(body.locations) ? body.locations : [body]

    // Validate required fields
    for (const loc of locationsArray) {
      if (!loc.locationName || !loc.locationType) {
        return NextResponse.json(
          { error: 'Each location must have locationName and locationType' },
          { status: 400 }
        )
      }
    }

    // Insert locations
    const locationInserts: TablesInsert<'ad_target_locations'>[] = locationsArray.map((loc: {
      locationName: string
      locationType: string
      latitude?: number
      longitude?: number
      radiusKm?: number
      inclusionMode?: string
      metaLocationKey?: string
    }) => ({
      ad_id: adId,
      location_name: loc.locationName,
      location_type: loc.locationType,
      latitude: loc.latitude || null,
      longitude: loc.longitude || null,
      radius_km: loc.radiusKm || null,
      inclusion_mode: loc.inclusionMode || 'include',
      meta_location_key: loc.metaLocationKey || null
    }))

    const { data: locations, error } = await supabaseServer
      .from('ad_target_locations')
      .insert(locationInserts)
      .select()

    if (error) {
      console.error('Error inserting locations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ locations: locations || [] }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to add locations' }, { status: 500 })
  }
}

// DELETE /api/ads/[id]/locations - Delete location(s)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await params
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

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

    // Delete specific location or all locations for this ad
    let deleteQuery = supabaseServer
      .from('ad_target_locations')
      .delete()
      .eq('ad_id', adId)

    if (locationId) {
      deleteQuery = deleteQuery.eq('id', locationId)
    }

    const { error } = await deleteQuery

    if (error) {
      console.error('Error deleting location(s):', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to delete location(s)' }, { status: 500 })
  }
}

