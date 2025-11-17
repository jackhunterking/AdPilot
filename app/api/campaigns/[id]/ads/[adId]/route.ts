/**
 * Feature: Campaign Ads API - Update & Delete
 * Purpose: Update ad details or delete ads
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { adDataService } from "@/lib/services/ad-data-service"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params
    const body = await request.json()

    // Only allow updating specific fields (normalized schema only)
    // Deprecated: creative_data, copy_data, setup_snapshot, destination_data (use /save endpoint instead)
    const allowedFields = ["name", "status", "metrics_snapshot", "meta_ad_id", "destination_type", "selected_creative_id", "selected_copy_id"]
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

    console.log(`[${traceId}] Fetching ad with normalized data:`, { campaignId, adId })

    // Fetch complete ad data from normalized tables
    const adData = await adDataService.getCompleteAdData(adId)

    if (!adData) {
      console.log(`[${traceId}] Ad not found:`, { adId, campaignId })
      return NextResponse.json(
        { error: "Ad not found" },
        { status: 404 }
      )
    }

    // Verify ad belongs to campaign
    if (adData.ad.campaign_id !== campaignId) {
      console.log(`[${traceId}] Ad belongs to different campaign:`, { 
        adId, 
        expectedCampaign: campaignId,
        actualCampaign: adData.ad.campaign_id
      })
      return NextResponse.json(
        { error: "Ad not found" },
        { status: 404 }
      )
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
      // Provide snapshot built from normalized tables
      setup_snapshot: snapshot
    }

    console.log(`[${traceId}] Ad fetched successfully with normalized data:`, { adId })
    return NextResponse.json({ ad: enrichedAd })
    
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

