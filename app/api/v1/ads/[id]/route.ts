/**
 * Feature: Ads API (v1) - Update, Get, Delete
 * Purpose: Update ad details or delete ads
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdOwnership, errorResponse, successResponse, ValidationError, NotFoundError } from '@/app/api/v1/_middleware'
import { supabaseServer } from "@/lib/supabase/server"
import { adDataService } from "@/lib/services/ad-data-service"

export async function PATCH(
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

    // Only allow updating specific fields (normalized schema only)
    const allowedFields = ["name", "status", "metrics_snapshot", "meta_ad_id", "destination_type", "selected_creative_id", "selected_copy_id"]
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = (body as Record<string, unknown>)[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid fields to update')
    }

    // Update ad
    const { data: ad, error } = await supabaseServer
      .from("ads")
      .update(updates)
      .eq("id", adId)
      .select()
      .single()

    if (error) {
      console.error('[PATCH /api/v1/ads/:id] Error:', error)
      throw new Error('Failed to update ad')
    }

    if (!ad) {
      throw new NotFoundError('Ad not found')
    }

    return successResponse({ ad })
  } catch (error) {
    console.error('[PATCH /api/v1/ads/:id] Error:', error)
    return errorResponse(error as Error)
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const traceId = `get_ad_${Date.now()}`
  
  try {
    const user = await requireAuth(request)
    const { id: adId } = await context.params
    
    // Verify ad ownership
    await requireAdOwnership(adId, user.id)

    console.log(`[${traceId}] Fetching ad with normalized data:`, { adId })

    // Fetch complete ad data from normalized tables
    const adData = await adDataService.getCompleteAdData(adId)

    if (!adData) {
      console.log(`[${traceId}] Ad not found:`, { adId })
      throw new NotFoundError('Ad not found')
    }

    // Build snapshot from normalized data
    const snapshot = adDataService.buildSnapshot(adData)

    const enrichedAd = {
      id: adData.ad.id,
      campaign_id: adData.ad.campaign_id,
      name: adData.ad.name,
      status: adData.ad.status,
      meta_ad_id: adData.ad.meta_ad_id,
      metrics_snapshot: adData.ad.metrics_snapshot,
      created_at: adData.ad.created_at,
      updated_at: adData.ad.updated_at,
      setup_snapshot: snapshot
    }

    console.log(`[${traceId}] ✅ Ad fetched successfully:`, { adId })
    return successResponse({ ad: enrichedAd })
    
  } catch (error) {
    console.error(`[${traceId}] Error:`, error)
    return errorResponse(error as Error)
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const traceId = `delete_ad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  try {
    const user = await requireAuth(request)
    const { id: adId } = await context.params
    
    // Verify ad ownership
    await requireAdOwnership(adId, user.id)

    console.log(`[${traceId}] Delete operation started:`, { adId })

    // Get ad details before deleting
    const { data: existingAd, error: fetchError } = await supabaseServer
      .from("ads")
      .select("id, name, status, meta_ad_id")
      .eq("id", adId)
      .single()

    if (fetchError || !existingAd) {
      console.warn(`[${traceId}] Ad not found:`, { adId, error: fetchError })
      throw new NotFoundError('Ad not found - it may have already been deleted')
    }

    console.log(`[${traceId}] Ad found, proceeding with deletion:`, {
      adId: existingAd.id,
      name: existingAd.name,
      hasMetaId: !!existingAd.meta_ad_id
    })

    // Delete ad (cascade will handle related data)
    const { error: deleteError } = await supabaseServer
      .from("ads")
      .delete()
      .eq("id", adId)

    if (deleteError) {
      console.error(`[${traceId}] Database delete failed:`, deleteError)
      throw new Error('Failed to delete ad from database')
    }

    console.log(`[${traceId}] ✅ Ad deleted successfully:`, {
      deletedAd: existingAd.id,
      name: existingAd.name
    })

    return successResponse({ 
      deletedAd: existingAd
    })
    
  } catch (error) {
    console.error(`[${traceId}] Error:`, error)
    return errorResponse(error as Error)
  }
}

