/**
 * Feature: Campaign Ads API - List & Create
 * Purpose: Fetch all ads for a campaign and create new ad drafts
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params

    // Fetch all ads for this campaign
    const { data: ads, error } = await supabaseServer
      .from("ads")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[GET /api/campaigns/[id]/ads] Error:", error)
      return NextResponse.json(
        { error: "Failed to fetch ads" },
        { status: 500 }
      )
    }

    return NextResponse.json({ ads: ads || [] })
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
      creative_data,
      copy_data,
      meta_ad_id = null,
      setup_snapshot // NEW: Accept complete wizard snapshot
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Ad name is required" },
        { status: 400 }
      )
    }

    // Validate setup_snapshot if provided
    if (setup_snapshot) {
      // Basic validation - ensure snapshot has required structure
      if (!setup_snapshot.creative || !setup_snapshot.copy || !setup_snapshot.goal) {
        return NextResponse.json(
          { error: "Invalid setup_snapshot structure" },
          { status: 400 }
        )
      }
    }

    // If setup_snapshot is provided, use it as source of truth for creative_data and copy_data
    let finalCreativeData = creative_data
    let finalCopyData = copy_data

    if (setup_snapshot) {
      // Extract creative data from snapshot
      finalCreativeData = {
        imageUrl: setup_snapshot.creative.imageVariations?.[setup_snapshot.creative.selectedImageIndex ?? 0] || setup_snapshot.creative.imageUrl,
        imageVariations: setup_snapshot.creative.imageVariations,
        baseImageUrl: setup_snapshot.creative.baseImageUrl,
        format: setup_snapshot.creative.format
      }

      // Extract copy data from snapshot
      finalCopyData = {
        headline: setup_snapshot.copy.headline,
        primaryText: setup_snapshot.copy.primaryText,
        description: setup_snapshot.copy.description,
        cta: setup_snapshot.copy.cta,
        variations: setup_snapshot.copy.variations
      }
    }

    // Create new ad with snapshot persisted to database
    const { data: ad, error } = await supabaseServer
      .from("ads")
      .insert({
        campaign_id: campaignId,
        name,
        status,
        creative_data: finalCreativeData,
        copy_data: finalCopyData,
        meta_ad_id,
        metrics_snapshot: null,
        setup_snapshot: setup_snapshot || null // Persist the snapshot
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

    return NextResponse.json({ ad }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/campaigns/[id]/ads] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

