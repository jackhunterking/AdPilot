/**
 * DEPRECATED: This endpoint is deprecated as of November 17, 2025
 * Use: PATCH /api/campaigns/[id]/ads/[adId]/snapshot
 * 
 * This file will be removed in a future release.
 * All functionality has been moved to the /snapshot endpoint which uses
 * a cleaner architecture with the adDataService.
 * 
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
  console.warn('[DEPRECATED] /save endpoint called. Migrate to PATCH /api/campaigns/[id]/ads/[adId]/snapshot')
  
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

    console.log(`[${traceId}] Validation passed, saving to normalized tables`)

    try {
      // 1. Save creative variations
      if (body.creative && body.creative.imageVariations && body.creative.imageVariations.length > 0) {
        // Delete existing creatives for this ad
        await supabaseServer
          .from('ad_creatives')
          .delete()
          .eq('ad_id', adId)

        // Insert all creative variations
        const creativeInserts = body.creative.imageVariations.map((imageUrl: string, idx: number) => ({
          ad_id: adId,
          creative_format: (body.creative.format as string) || 'feed',
          image_url: imageUrl,
          creative_style: null,
          variation_label: `Variation ${idx + 1}`,
          is_base_image: idx === 0,
          sort_order: idx
        }))

        const { data: creatives, error: creativesError } = await supabaseServer
          .from('ad_creatives')
          .insert(creativeInserts)
          .select()

        if (creativesError) {
          console.error(`[${traceId}] Failed to save creatives:`, creativesError)
          throw new Error('Failed to save creatives')
        }

        // Set selected creative
        const selectedIdx = body.creative.selectedImageIndex || 0
        if (creatives && creatives[selectedIdx]) {
          await supabaseServer
            .from('ads')
            .update({ selected_creative_id: creatives[selectedIdx].id })
            .eq('id', adId)
        }
      }

      // 2. Save copy variations
      if (body.copy && body.copy.variations && body.copy.variations.length > 0) {
        // Delete existing copy variations
        await supabaseServer
          .from('ad_copy_variations')
          .delete()
          .eq('ad_id', adId)

        // Insert all copy variations
        const copyInserts = body.copy.variations.map((variation: { headline: string; primaryText: string; description: string }, idx: number) => ({
          ad_id: adId,
          headline: variation.headline,
          primary_text: variation.primaryText,
          description: variation.description || null,
          cta_text: body.destination?.cta || 'Learn More',
          is_selected: idx === (body.copy.selectedCopyIndex || 0),
          sort_order: idx
        }))

        const { data: copyVariations, error: copyError } = await supabaseServer
          .from('ad_copy_variations')
          .insert(copyInserts)
          .select()

        if (copyError) {
          console.error(`[${traceId}] Failed to save copy:`, copyError)
          throw new Error('Failed to save copy variations')
        }

        // Set selected copy
        const selectedCopy = copyVariations?.find(c => c.is_selected)
        if (selectedCopy) {
          await supabaseServer
            .from('ads')
            .update({ selected_copy_id: selectedCopy.id })
            .eq('id', adId)
        }
      }

      // 3. Save destination
      if (body.destination) {
        let destinationType = 'website_url'
        if (body.destination.type === 'form') destinationType = 'instant_form'
        if (body.destination.type === 'call') destinationType = 'phone_number'

        await supabaseServer
          .from('ad_destinations')
          .upsert({
            ad_id: adId,
            destination_type: destinationType,
            website_url: body.destination.url || null,
            display_link: body.destination.url || null,
            phone_number: body.destination.phoneNumber || null,
            phone_formatted: body.destination.normalizedPhone || null,
            instant_form_id: null // TODO: Handle form ID when forms are implemented
          }, { onConflict: 'ad_id' })

        // Update destination_type on ads table for backward compatibility
        await supabaseServer
          .from('ads')
          .update({ 
            destination_type: body.destination.type,
            updated_at: new Date().toISOString()
          })
          .eq('id', adId)
      }

      console.log(`[${traceId}] Ad saved successfully to normalized tables`)

      // Fetch updated ad with all relations
      const { data: updatedAd, error: fetchError } = await supabaseServer
        .from('ads')
        .select(`
          *,
          ad_creatives!ad_creatives_ad_id_fkey (*),
          ad_copy_variations!ad_copy_variations_ad_id_fkey (*),
          ad_destinations!ad_destinations_ad_id_fkey (*)
        `)
        .eq('id', adId)
        .single()

      if (fetchError || !updatedAd) {
        console.error(`[${traceId}] Failed to fetch updated ad:`, fetchError)
        throw new Error('Failed to fetch updated ad')
      }

      // Return success response
      const response: SaveAdResponse = {
        success: true,
        ad: {
          id: updatedAd.id,
          campaign_id: updatedAd.campaign_id,
          name: updatedAd.name,
          status: updatedAd.status,
          copy_data: null, // Deprecated
          creative_data: null, // Deprecated
          destination_data: null, // Deprecated
          setup_snapshot: null, // Deprecated
          updated_at: updatedAd.updated_at
        }
      }
      
      return NextResponse.json(response)
    } catch (saveError) {
      console.error(`[${traceId}] Save operation failed:`, saveError)
      return NextResponse.json(
        { success: false, error: saveError instanceof Error ? saveError.message : 'Failed to save ad' } as SaveAdResponse,
        { status: 500 }
      )
    }
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

