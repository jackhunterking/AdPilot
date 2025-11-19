/**
 * Feature: Single Location Removal API (v1)
 * Purpose: Delete specific location by database ID
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdOwnership, errorResponse, successResponse } from '@/app/api/v1/_middleware'
import { supabaseServer } from '@/lib/supabase/server'

// DELETE /api/v1/ads/[id]/locations/[locationId] - Remove specific location
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id: adId, locationId } = await context.params
    
    // Verify ad ownership
    await requireAdOwnership(adId, user.id)

    // Delete specific location by database ID
    const { error: deleteError } = await supabaseServer
      .from('ad_target_locations')
      .delete()
      .eq('id', locationId)
      .eq('ad_id', adId)  // Extra safety - ensure belongs to this ad

    if (deleteError) {
      console.error('[DELETE /api/v1/ads/:id/locations/:locationId] Delete error:', deleteError)
      throw new Error('Failed to remove location')
    }

    console.log('[DELETE /api/v1/ads/:id/locations/:locationId] ✅ Removed location:', locationId)

    return successResponse({ message: 'Location removed' })
  } catch (error) {
    console.error('[DELETE /api/v1/ads/:id/locations/:locationId] Error:', error)
    return errorResponse(error as Error)
  }
}
