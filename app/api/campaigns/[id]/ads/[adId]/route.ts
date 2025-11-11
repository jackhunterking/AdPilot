/**
 * Feature: Campaign Ads API - Update & Delete
 * Purpose: Update ad details or delete ads
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params
    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = ["name", "status", "creative_data", "copy_data", "metrics_snapshot", "meta_ad_id", "setup_snapshot"]
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Update ad
    const { data: ad, error } = await supabaseServer
      .from("ads")
      .update(updates)
      .eq("id", adId)
      .eq("campaign_id", campaignId) // Ensure ad belongs to campaign
      .select()
      .single()

    if (error) {
      console.error("[PATCH /api/campaigns/[id]/ads/[adId]] Error:", error)
      return NextResponse.json(
        { error: "Failed to update ad" },
        { status: 500 }
      )
    }

    if (!ad) {
      return NextResponse.json(
        { error: "Ad not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ ad })
  } catch (error) {
    console.error("[PATCH /api/campaigns/[id]/ads/[adId]] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  const traceId = `get_ad_${Date.now()}`
  
  try {
    const { id: campaignId, adId } = await context.params

    console.log(`[${traceId}] Fetching ad:`, { campaignId, adId })

    // Fetch single ad
    const { data: ad, error } = await supabaseServer
      .from("ads")
      .select("*")
      .eq("id", adId)
      .eq("campaign_id", campaignId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`[${traceId}] Ad not found:`, { adId, campaignId })
        return NextResponse.json(
          { error: "Ad not found" },
          { status: 404 }
        )
      }
      
      console.error(`[${traceId}] Error fetching ad:`, error)
      return NextResponse.json(
        { error: "Failed to fetch ad" },
        { status: 500 }
      )
    }

    console.log(`[${traceId}] Ad fetched successfully:`, { adId })
    return NextResponse.json({ ad })
    
  } catch (error) {
    console.error(`[${traceId}] Unexpected error:`, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  const traceId = `delete_ad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  try {
    const { id: campaignId, adId } = await context.params

    console.log(`[${traceId}] Delete operation started:`, { campaignId, adId })

    // First, verify the ad exists and belongs to this campaign
    const { data: existingAd, error: fetchError } = await supabaseServer
      .from("ads")
      .select("id, name, status, meta_ad_id")
      .eq("id", adId)
      .eq("campaign_id", campaignId)
      .single()

    if (fetchError || !existingAd) {
      if (fetchError?.code === 'PGRST116' || !existingAd) {
        console.warn(`[${traceId}] Ad not found (already deleted or doesn't exist):`, {
          adId,
          campaignId,
          error: fetchError
        })
        return NextResponse.json(
          { error: "Ad not found - it may have already been deleted" },
          { status: 404 }
        )
      }
      
      console.error(`[${traceId}] Error checking ad existence:`, fetchError)
      return NextResponse.json(
        { error: "Failed to verify ad" },
        { status: 500 }
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
      .from("ads")
      .delete()
      .eq("id", adId)
      .eq("campaign_id", campaignId)

    if (deleteError) {
      console.error(`[${traceId}] Database delete failed:`, {
        error: deleteError,
        adId,
        campaignId
      })
      return NextResponse.json(
        { error: "Failed to delete ad from database" },
        { status: 500 }
      )
    }

    // Verify deletion by trying to fetch again
    const { data: verifyAd, error: verifyError } = await supabaseServer
      .from("ads")
      .select("id")
      .eq("id", adId)
      .eq("campaign_id", campaignId)
      .single()

    if (verifyAd) {
      console.error(`[${traceId}] Deletion verification failed - ad still exists!`, {
        adId,
        campaignId
      })
      return NextResponse.json(
        { error: "Ad deletion could not be verified" },
        { status: 500 }
      )
    }

    console.log(`[${traceId}] Ad deleted and verified successfully:`, {
      deletedAd: existingAd.id,
      name: existingAd.name
    })

    // Return the deleted ad data for client-side verification
    return NextResponse.json({ 
      success: true,
      deletedAd: existingAd
    })
    
  } catch (error) {
    console.error(`[${traceId}] Unexpected error during deletion:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

