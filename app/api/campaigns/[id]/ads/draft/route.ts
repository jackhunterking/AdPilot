/**
 * Feature: Campaign Draft Ad Creation
 * Purpose: Create draft ad records for new ad creation flow
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/insert
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient, supabaseServer } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const traceId = `draft_create_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  try {
    const { id: campaignId } = await context.params
    
    console.log(`[${traceId}] Draft ad creation started:`, { campaignId })

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error(`[${traceId}] Authentication failed:`, authError)
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify user owns the campaign (explicit check + RLS)
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id, user_id, name")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single()

    if (campaignError || !campaign) {
      console.error(`[${traceId}] Campaign not found or access denied:`, {
        campaignError,
        campaignId,
        userId: user.id
      })
      
      if (campaignError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: "Access denied - you don't own this campaign" },
        { status: 403 }
      )
    }

    // Generate unique draft ad name with timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    const baseName = `${campaign.name} - Draft ${timestamp}`
    
    // Try to create the ad with retry logic for name conflicts
    let adName = baseName
    let attempts = 0
    const maxAttempts = 5
    let createdAd = null

    while (attempts < maxAttempts && !createdAd) {
      attempts++
      
      try {
        console.log(`[${traceId}] Attempt ${attempts}: Creating draft ad with name:`, adName)
        
        const { data: ad, error: insertError } = await supabaseServer
          .from("ads")
          .insert({
            campaign_id: campaignId,
            name: adName,
            status: "draft",
            creative_data: null,
            copy_data: null,
            meta_ad_id: null,
            metrics_snapshot: null
          })
          .select()
          .single()

        if (insertError) {
          // Check if it's a duplicate name error
          if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
            console.warn(`[${traceId}] Duplicate name detected, retrying with suffix:`, {
              attempt: attempts,
              name: adName
            })
            // Add/increment suffix for next attempt
            adName = `${baseName} (${attempts})`
            continue
          }
          
          // Other error - throw it
          throw insertError
        }

        createdAd = ad
        console.log(`[${traceId}] Draft ad created successfully:`, {
          adId: ad.id,
          name: ad.name,
          attempts
        })
        
      } catch (err) {
        // If last attempt, throw the error
        if (attempts >= maxAttempts) {
          throw err
        }
        // Otherwise, try again with new name
        adName = `${baseName} (${attempts})`
      }
    }

    if (!createdAd) {
      console.error(`[${traceId}] Failed to create draft ad after ${maxAttempts} attempts`)
      return NextResponse.json(
        { error: "Failed to create draft ad - please try again" },
        { status: 500 }
      )
    }

    return NextResponse.json({ ad: createdAd }, { status: 201 })
    
  } catch (error) {
    console.error(`[${traceId}] Unexpected error creating draft ad:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: "Internal server error - failed to create draft ad" },
      { status: 500 }
    )
  }
}
