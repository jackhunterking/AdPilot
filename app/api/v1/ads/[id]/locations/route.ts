/**
 * Feature: Location Operations API
 * Purpose: Granular endpoints for location targeting operations
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

// POST /locations - Add/Include location(s)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params;
    const body = await request.json();

    // Authenticate
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single();

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate input - only NEW locations
    if (!body.locations || !Array.isArray(body.locations) || body.locations.length === 0) {
      return NextResponse.json({ error: 'locations array required' }, { status: 400 });
    }

    // Insert new locations (DO NOT delete existing - this is ADD operation)
    const locationInserts = body.locations.map((loc: {
      name: string;
      type: string;
      coordinates: [number, number];
      radius?: number;
      key?: string;
      bbox?: [number, number, number, number];
      geometry?: object;
    }) => ({
      ad_id: adId,
      location_name: loc.name,
      location_type: loc.type,
      longitude: loc.coordinates[0],
      latitude: loc.coordinates[1],
      radius_km: loc.radius ? loc.radius * 1.60934 : null,
      inclusion_mode: 'include',  // Always include for this endpoint
      meta_location_key: loc.key || null,
      bbox: loc.bbox || null,
      geometry: loc.geometry || null
    }));

    const { data: inserted, error: insertError } = await supabaseServer
      .from('ad_target_locations')
      .insert(locationInserts)
      .select();

    if (insertError) {
      console.error('[POST locations] Insert error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to add locations',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log('[POST locations] ✅ Added locations:', {
      adId,
      count: inserted?.length,
      names: inserted?.map(l => l.location_name)
    });

    return NextResponse.json({ 
      success: true,
      count: inserted?.length,
      locations: inserted
    });
  } catch (error) {
    console.error('[POST locations] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE /locations - Clear all locations
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params;

    // Authenticate
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single();

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete ALL locations for this ad
    const { error: deleteError } = await supabaseServer
      .from('ad_target_locations')
      .delete()
      .eq('ad_id', adId);

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to clear locations',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('[DELETE locations] ✅ Cleared all locations for ad:', adId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE locations] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

