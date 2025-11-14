/**
 * Feature: Save Ad Changes API
 * Purpose: Comprehensive save endpoint for ad edits (copy, creative, destination)
 * References:
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 *  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient, supabaseServer } from "@/lib/supabase/server"
import type { SaveAdPayload, SaveAdResponse } from "@/lib/types/workspace"
import type { Json } from "@/lib/supabase/database.types"

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  const traceId = `save_ad_${Date.now()}`
  
  try {
    const { id: campaignId, adId } = await context.params
    
    console.log(`[${traceId}] Save ad changes request:`, { campaignId, adId })

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error(`[${traceId}] Authentication failed:`, authError)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as SaveAdResponse,
        { status: 401 }
      )
    }

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error(`[${traceId}] Campaign not found:`, campaignError)
      return NextResponse.json(
        { success: false, error: 'Campaign not found' } as SaveAdResponse,
        { status: 404 }
      )
    }

    if (campaign.user_id !== user.id) {
      console.error(`[${traceId}] User doesn't own campaign:`, {
        userId: user.id,
        campaignUserId: campaign.user_id
      })
      return NextResponse.json(
        { success: false, error: 'Forbidden - You do not own this campaign' } as SaveAdResponse,
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json() as SaveAdPayload
    
    // Validate required fields
    if (!body.copy || !body.creative || !body.destination) {
      console.error(`[${traceId}] Missing required fields:`, {
        hasCopy: !!body.copy,
        hasCreative: !!body.creative,
        hasDestination: !!body.destination
      })
      return NextResponse.json(
        { success: false, error: 'Missing required fields: copy, creative, or destination' } as SaveAdResponse,
        { status: 400 }
      )
    }

    // Validate copy data
    if (!body.copy.headline || !body.copy.primaryText) {
      return NextResponse.json(
        { success: false, error: 'Copy must include headline and primaryText' } as SaveAdResponse,
        { status: 400 }
      )
    }

    // Validate creative data
    if (!body.creative.imageVariations || body.creative.imageVariations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Creative must include at least one image variation' } as SaveAdResponse,
        { status: 400 }
      )
    }

    // Validate destination data
    const validDestinationTypes = ['website', 'form', 'call']
    if (!validDestinationTypes.includes(body.destination.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid destination type' } as SaveAdResponse,
        { status: 400 }
      )
    }

    // Validate type-specific destination fields
    if (body.destination.type === 'website' && !body.destination.url) {
      return NextResponse.json(
        { success: false, error: 'Website destination requires url' } as SaveAdResponse,
        { status: 400 }
      )
    }

    if (body.destination.type === 'call' && !body.destination.phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Call destination requires phoneNumber' } as SaveAdResponse,
        { status: 400 }
      )
    }

    console.log(`[${traceId}] Validation passed, building update data`)

    // Build structured data objects
    const copyData: Json = {
      primaryText: body.copy.primaryText,
      headline: body.copy.headline,
      description: body.copy.description || '',
      selectedCopyIndex: body.copy.selectedCopyIndex,
      variations: body.copy.variations || []
    }

    const creativeData: Json = {
      imageVariations: body.creative.imageVariations,
      selectedImageIndex: body.creative.selectedImageIndex,
      selectedCreativeVariation: body.creative.selectedCreativeVariation,
      baseImageUrl: body.creative.baseImageUrl || null,
      format: body.creative.format
    }

    const destinationData: Json = {
      type: body.destination.type,
      url: body.destination.url || null,
      phoneNumber: body.destination.phoneNumber || null,
      normalizedPhone: body.destination.normalizedPhone || null,
      formFields: body.destination.formFields || null,
      cta: body.destination.cta
    }

    // Build comprehensive setup_snapshot
    const setupSnapshot: Json = {
      // Include all structured data
      copy: copyData,
      creative: creativeData,
      destination: destinationData,
      
      // Add metadata
      metadata: {
        savedAt: new Date().toISOString(),
        version: '1.0',
        editedBy: user.id,
        editContext: body.metadata?.editContext || 'manual_save',
        savedFrom: body.metadata?.savedFrom || 'edit_mode'
      }
    }

    console.log(`[${traceId}] Updating ad in database`)

    // Update ad with all data in single transaction
    const { data: updatedAd, error: updateError } = await supabaseServer
      .from('ads')
      .update({
        copy_data: copyData,
        creative_data: creativeData,
        destination_data: destinationData,
        destination_type: body.destination.type,
        setup_snapshot: setupSnapshot,
        updated_at: new Date().toISOString()
      })
      .eq('id', adId)
      .eq('campaign_id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error(`[${traceId}] Database update failed:`, updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to save ad changes' } as SaveAdResponse,
        { status: 500 }
      )
    }

    if (!updatedAd) {
      console.error(`[${traceId}] Ad not found after update`)
      return NextResponse.json(
        { success: false, error: 'Ad not found' } as SaveAdResponse,
        { status: 404 }
      )
    }

    console.log(`[${traceId}] Ad saved successfully:`, {
      adId: updatedAd.id,
      updatedAt: updatedAd.updated_at
    })

    // Return success response
    const response: SaveAdResponse = {
      success: true,
      ad: {
        id: updatedAd.id,
        campaign_id: updatedAd.campaign_id,
        name: updatedAd.name,
        status: updatedAd.status,
        copy_data: updatedAd.copy_data,
        creative_data: updatedAd.creative_data,
        destination_data: updatedAd.destination_data,
        setup_snapshot: updatedAd.setup_snapshot,
        updated_at: updatedAd.updated_at
      }
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error(`[${traceId}] Unexpected error:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as SaveAdResponse,
      { status: 500 }
    )
  }
}

