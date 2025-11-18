/**
 * Feature: Campaign Ads API - List & Create
 * Purpose: Fetch all ads for a campaign and create new ad drafts
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"
import { adDataService } from "@/lib/services/ad-data-service"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params

    // Fetch all ads with normalized data
    const completeAds = await adDataService.getCampaignAds(campaignId)

    // Build enriched response with snapshots from normalized tables
    const adsWithSnapshots = completeAds.map(adData => {
      const snapshot = adDataService.buildSnapshot(adData)
      
      return {
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
    })

    return NextResponse.json({ ads: adsWithSnapshots })
  } catch (error) {
    console.error("[GET /api/campaigns/[id]/ads] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params
    const body = await request.json()

    const {
      name,
      status = "draft",
      meta_ad_id = null,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Ad name is required" },
        { status: 400 }
      )
    }

    // Create new ad (data will be added via snapshot API)
    // Note: creative_data, copy_data, setup_snapshot are deprecated
    // Use /snapshot endpoint to save ad data to normalized tables
    const { data: ad, error } = await supabaseServer
      .from("ads")
      .insert({
        campaign_id: campaignId,
        name,
        status,
        meta_ad_id,
        metrics_snapshot: null,
      })
      .select()
      .single()

    if (error) {
      console.error("[POST /api/campaigns/[id]/ads] Error:", error)
      return NextResponse.json(
        { error: "Failed to create ad" },
        { status: 500 }
      )
    }

    console.log("[POST /api/campaigns/[id]/ads] Created ad:", ad.id)

    return NextResponse.json({ ad }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/campaigns/[id]/ads] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

