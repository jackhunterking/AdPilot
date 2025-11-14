/**
 * Feature: Ad Snapshot API
 * Purpose: Update ad's setup_snapshot with partial updates (merge strategy)
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

    console.log('[PATCH snapshot] Updating ad snapshot:', {
      campaignId,
      adId,
      sections: Object.keys(body)
    })

    // First, fetch the current ad to get existing setup_snapshot
    const { data: currentAd, error: fetchError } = await supabaseServer
      .from("ads")
      .select("setup_snapshot")
      .eq("id", adId)
      .eq("campaign_id", campaignId)
      .single()

    if (fetchError || !currentAd) {
      console.error('[PATCH snapshot] Ad not found:', fetchError)
      return NextResponse.json(
        { error: "Ad not found" },
        { status: 404 }
      )
    }

    // Merge new data with existing snapshot (shallow merge at top level)
    const existingSnapshot = (currentAd.setup_snapshot as Record<string, unknown>) || {}
    const updatedSnapshot = {
      ...existingSnapshot,
      ...body
    }

    console.log('[PATCH snapshot] Merged snapshot:', {
      existingSections: Object.keys(existingSnapshot),
      newSections: Object.keys(body),
      finalSections: Object.keys(updatedSnapshot)
    })

    // Update the ad with merged snapshot
    const { data: updatedAd, error: updateError } = await supabaseServer
      .from("ads")
      .update({ 
        setup_snapshot: updatedSnapshot,
        updated_at: new Date().toISOString()
      })
      .eq("id", adId)
      .eq("campaign_id", campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH snapshot] Update failed:', updateError)
      return NextResponse.json(
        { error: "Failed to update snapshot" },
        { status: 500 }
      )
    }

    console.log('[PATCH snapshot] Snapshot updated successfully')
    
    return NextResponse.json({ 
      success: true,
      setup_snapshot: updatedAd.setup_snapshot 
    })
    
  } catch (error) {
    console.error('[PATCH snapshot] Unexpected error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

