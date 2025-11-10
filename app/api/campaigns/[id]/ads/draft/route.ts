/**
 * Feature: Draft Ad Creation API
 * Purpose: Create a new draft ad record when user presses "New Ad" button
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/insert
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params

    // Get campaign name for generating ad name
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("name")
      .eq("id", campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error("[POST /api/campaigns/[id]/ads/draft] Campaign not found:", campaignError)
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // Count existing ads to generate unique name
    const { count } = await supabaseServer
      .from("ads")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)

    const adNumber = (count || 0) + 1
    const timestamp = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })

    // Create minimal draft ad record
    const { data: ad, error } = await supabaseServer
      .from("ads")
      .insert({
        campaign_id: campaignId,
        name: `${campaign.name} - Ad ${adNumber} (${timestamp})`,
        status: "draft",
        creative_data: null,
        copy_data: null,
        meta_ad_id: null,
        metrics_snapshot: null,
        setup_snapshot: {
          creative: { imageVariations: [], selectedImageIndex: null },
          copy: { variations: [], selectedCopyIndex: null },
          location: { locations: [], status: 'incomplete' },
          audience: { status: 'incomplete' },
          goal: { status: 'incomplete' },
          budget: { status: 'incomplete' }
        }
      })
      .select()
      .single()

    if (error) {
      console.error("[POST /api/campaigns/[id]/ads/draft] Error creating draft:", error)
      return NextResponse.json(
        { error: "Failed to create draft ad" },
        { status: 500 }
      )
    }

    console.log(`[POST /api/campaigns/[id]/ads/draft] ✅ Created draft ad: ${ad.id}`)

    return NextResponse.json({ ad }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/campaigns/[id]/ads/draft] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

