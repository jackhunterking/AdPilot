/**
 * Feature: Ad Snapshot Save/Load API
 * Purpose: Save ad data to normalized tables and retrieve complete snapshots
 * 
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - adDataService: lib/services/ad-data-service.ts
 *  - Supabase: https://supabase.com/docs/reference/javascript/update
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdOwnership, errorResponse, successResponse, NotFoundError, ValidationError, validateMethod } from '@/app/api/v1/_middleware'
import { supabaseServer } from "@/lib/supabase/server"
import { adDataService } from '@/lib/services/ad-data-service'
import type { SaveAdPayload, SaveAdResponse } from "@/lib/types/workspace"
import type { Json } from "@/lib/supabase/database.types"

/**
 * GET /api/v1/ads/[id]/save - Get ad snapshot
 * 
 * Returns complete ad snapshot built from normalized tables.
 * Single source of truth: Supabase database
 * 
 * References:
 *  - API v1: MASTER_API_DOCUMENTATION.mdc
 *  - adDataService: lib/services/ad-data-service.ts
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Validate HTTP method
  const methodError = validateMethod(request, ['GET', 'PUT'])
  if (methodError) return methodError
  
  try {
    const user = await requireAuth(request)
    const { id: adId } = await context.params
    
    // Verify ownership via middleware helper
    await requireAdOwnership(adId, user.id)
    
    // Fetch complete ad data from normalized tables
    const adData = await adDataService.getCompleteAdData(adId)
    
    if (!adData) {
      throw new NotFoundError('Ad not found')
    }
    
    // Build snapshot using service (single source of truth)
    const snapshot = adDataService.buildSnapshot(adData)
    
    // Calculate completed steps for wizard
    const completedSteps = calculateCompletedSteps(snapshot)
    
    return successResponse({ 
      snapshot,
      completedSteps 
    })
  } catch (error) {
    console.error('[GET /api/v1/ads/:id/save] Error:', error)
    return errorResponse(error as Error)
  }
}

/**
 * Calculate wizard steps from snapshot
 * Determines which steps are complete based on snapshot data
 */
function calculateCompletedSteps(snapshot: unknown): string[] {
  const steps: string[] = []
  const s = snapshot as Record<string, unknown>
  
  // Creative complete if has variations and selection
  const creative = s.creative as Record<string, unknown> | undefined
  if (creative?.imageVariations && Array.isArray(creative.imageVariations) 
      && creative.imageVariations.length > 0 
      && typeof creative.selectedImageIndex === 'number') {
    steps.push('ads')
  }
  
  // Copy complete if has variations and selection
  const copy = s.copy as Record<string, unknown> | undefined
  if (copy?.variations && Array.isArray(copy.variations)
      && copy.variations.length > 0
      && typeof copy.selectedCopyIndex === 'number') {
    steps.push('copy')
  }
  
  // Destination complete if has type
  const destination = s.destination as Record<string, unknown> | undefined | null
  if (destination?.type) {
    steps.push('destination')
  }
  
  // Location complete if has locations
  const location = s.location as Record<string, unknown> | undefined
  if (location?.locations && Array.isArray(location.locations)
      && location.locations.length > 0) {
    steps.push('location')
  }
  
  return steps
}

/**
 * PUT /api/v1/ads/[id]/save - Save ad data
 * 
 * Saves ad creative, copy, destination, and location data to normalized tables.
 * Single source of truth: Supabase database
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Validate HTTP method
  const methodError = validateMethod(request, ['GET', 'PUT'])
  if (methodError) return methodError
  
  const traceId = `save_ad_${Date.now()}`
  
  try {
    const user = await requireAuth(request)
    const { id: adId } = await context.params
    
    console.log(`[${traceId}] Save ad changes request:`, { adId })

    // Verify ad ownership
    await requireAdOwnership(adId, user.id)

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

