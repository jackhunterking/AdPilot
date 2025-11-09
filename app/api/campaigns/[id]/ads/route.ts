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
      meta_ad_id = null
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Ad name is required" },
        { status: 400 }
      )
    }

    // Create new ad
    const { data: ad, error } = await supabaseServer
      .from("ads")
      .insert({
        campaign_id: campaignId,
        name,
        status,
        creative_data,
        copy_data,
        meta_ad_id,
        metrics_snapshot: null
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

