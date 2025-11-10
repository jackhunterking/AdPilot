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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params

    // Delete ad
    const { error } = await supabaseServer
      .from("ads")
      .delete()
      .eq("id", adId)
      .eq("campaign_id", campaignId) // Ensure ad belongs to campaign

    if (error) {
      console.error("[DELETE /api/campaigns/[id]/ads/[adId]] Error:", error)
      return NextResponse.json(
        { error: "Failed to delete ad" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/campaigns/[id]/ads/[adId]] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

