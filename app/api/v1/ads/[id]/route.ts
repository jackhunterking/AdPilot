/**
 * Feature: Ad Detail API v1
 * Purpose: Get, update, and delete specific ads
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 *  - Next.js Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase/server'
import type { UpdateAdRequest } from '@/lib/types/api'

// ============================================================================
// Type Guards
// ============================================================================

function isUpdateAdRequest(body: unknown): body is UpdateAdRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    (!('name' in b) || typeof b.name === 'string') &&
    (!('status' in b) || typeof b.status === 'string')
  )
}

// ============================================================================
// GET /api/v1/ads/[id] - Get a specific ad
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = `get_ad_${Date.now()}`
  
  try {
    const { id: adId } = await params // MUST await (Next.js 15+)

    console.log(`[${traceId}] Fetching ad:`, { adId })

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Fetch ad with campaign to verify ownership
    const { data: ad, error } = await supabaseServer
      .from('ads')
      .select('*, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`[${traceId}] Ad not found:`, { adId })
        return NextResponse.json(
          { success: false, error: { code: 'not_found', message: 'Ad not found' } },
          { status: 404 }
        )
      }
      
      console.error(`[${traceId}] Error fetching ad:`, error)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: 'Failed to fetch ad' } },
        { status: 500 }
      )
    }

    // Check ownership
    if (ad.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Access denied' } },
        { status: 403 }
      )
    }

    console.log(`[${traceId}] Ad fetched successfully:`, { adId })
    
    // Remove the campaigns object from response
    const { campaigns: _campaigns, ...adData } = ad
    
    return NextResponse.json({
      success: true,
      data: { ad: adData }
    })
    
  } catch (error) {
    console.error(`[${traceId}] Unexpected error:`, error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/v1/ads/[id] - Update ad
// ============================================================================

export async function PATCH(
  request: NextRequest,
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

    // Parse and validate request body
    const body: unknown = await request.json()
    if (!isUpdateAdRequest(body)) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'Invalid request body' } },
        { status: 400 }
      )
    }

    // Verify ad ownership
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('campaign_id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (!ad || ad.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    // Only allow updating specific fields
    const allowedFields = ['name', 'status', 'creative_data', 'copy_data', 'metrics_snapshot', 'meta_ad_id', 'setup_snapshot', 'destination_type', 'destination_data']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = (body as Record<string, unknown>)[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'validation_error', message: 'No valid fields to update' } },
        { status: 400 }
      )
    }

    // Update ad
    const { data: updatedAd, error: updateError } = await supabaseServer
      .from('ads')
      .update(updates)
      .eq('id', adId)
      .eq('campaign_id', ad.campaign_id) // Ensure ad belongs to campaign
      .select()
      .single()

    if (updateError) {
      console.error('[v1/ads/:id] PATCH error:', updateError)
      return NextResponse.json(
        { success: false, error: { code: 'update_failed', message: 'Failed to update ad' } },
        { status: 500 }
      )
    }

    if (!updatedAd) {
      return NextResponse.json(
        { success: false, error: { code: 'not_found', message: 'Ad not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ad: updatedAd }
    })
  } catch (error) {
    console.error('[v1/ads/:id] PATCH unexpected error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/v1/ads/[id] - Delete ad
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = `delete_ad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  try {
    const { id: adId } = await params

    console.log(`[${traceId}] Delete operation started:`, { adId })

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // First, verify the ad exists and user owns it
    const { data: existingAd, error: fetchError } = await supabaseServer
      .from('ads')
      .select('id, name, status, meta_ad_id, campaigns!inner(user_id)')
      .eq('id', adId)
      .single()

    if (fetchError || !existingAd) {
      if (fetchError?.code === 'PGRST116' || !existingAd) {
        console.warn(`[${traceId}] Ad not found (already deleted or doesn't exist):`, {
          adId,
          error: fetchError
        })
        return NextResponse.json(
          { success: false, error: { code: 'not_found', message: 'Ad not found - it may have already been deleted' } },
          { status: 404 }
        )
      }
      
      console.error(`[${traceId}] Error checking ad existence:`, fetchError)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_failed', message: 'Failed to verify ad' } },
        { status: 500 }
      )
    }

    // Check ownership
    if (existingAd.campaigns.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Access denied' } },
        { status: 403 }
      )
    }

    console.log(`[${traceId}] Ad found, proceeding with deletion:`, {
      adId: existingAd.id,
      name: existingAd.name,
      status: existingAd.status,
      hasMetaId: !!existingAd.meta_ad_id
    })

    // Delete ad from database
    const { error: deleteError } = await supabaseServer
      .from('ads')
      .delete()
      .eq('id', adId)

    if (deleteError) {
      console.error(`[${traceId}] Database delete failed:`, {
        error: deleteError,
        adId
      })
      return NextResponse.json(
        { success: false, error: { code: 'deletion_failed', message: 'Failed to delete ad from database' } },
        { status: 500 }
      )
    }

    // Verify deletion by trying to fetch again
    const { data: verifyAd } = await supabaseServer
      .from('ads')
      .select('id')
      .eq('id', adId)
      .single()

    if (verifyAd) {
      console.error(`[${traceId}] Deletion verification failed - ad still exists!`, {
        adId
      })
      return NextResponse.json(
        { success: false, error: { code: 'deletion_failed', message: 'Ad deletion could not be verified' } },
        { status: 500 }
      )
    }

    console.log(`[${traceId}] Ad deleted and verified successfully:`, {
      deletedAd: existingAd.id,
      name: existingAd.name
    })

    // Return the deleted ad data for client-side verification
    const { campaigns: _campaigns, ...deletedAdData } = existingAd
    
    return NextResponse.json({ 
      success: true,
      data: { deletedAd: deletedAdData }
    })
    
  } catch (error) {
    console.error(`[${traceId}] Unexpected error during deletion:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

