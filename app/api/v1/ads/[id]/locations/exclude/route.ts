/**
 * Feature: Location Exclude API (v1)
 * Purpose: Add locations with exclude mode
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdOwnership, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware'
import { supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

// POST /api/v1/ads/[id]/locations/exclude - Exclude location(s)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id: adId } = await context.params
    
    // Verify ad ownership
    await requireAdOwnership(adId, user.id)
    
    const body: unknown = await request.json()
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body')
    }
    
    const { locations } = body as { locations?: unknown }

    // Validate input
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      throw new ValidationError('locations array required')
    }

    // Insert with exclude mode
    const locationInserts = locations.map((loc: {
      name: string
      type: string
      coordinates: [number, number]
      radius?: number
      key?: string
      bbox?: [number, number, number, number]
      geometry?: object
    }) => ({
      ad_id: adId,
      location_name: loc.name,
      location_type: loc.type,
      longitude: loc.coordinates[0],
      latitude: loc.coordinates[1],
      radius_km: loc.radius ? loc.radius * 1.60934 : null,
      inclusion_mode: 'exclude',  // Always exclude for this endpoint
      meta_location_key: loc.key || null,
      bbox: loc.bbox as unknown as Json || null,
      geometry: loc.geometry as unknown as Json || null
    }))

    const { data: inserted, error: insertError } = await supabaseServer
      .from('ad_target_locations')
      .insert(locationInserts)
      .select()

    if (insertError) {
      console.error('[POST /api/v1/ads/:id/locations/exclude] Insert error:', insertError)
      throw new Error('Failed to exclude locations')
    }

    console.log('[POST /api/v1/ads/:id/locations/exclude] ✅ Excluded locations:', {
      adId,
      count: inserted?.length,
      names: inserted?.map(l => l.location_name)
    })

    return successResponse({ 
      count: inserted?.length,
      locations: inserted
    })
  } catch (error) {
    console.error('[POST /api/v1/ads/:id/locations/exclude] Error:', error)
    return errorResponse(error as Error)
  }
}
