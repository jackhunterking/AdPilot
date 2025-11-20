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
    
    // Allow partial saves (draft mode) - validate only what's present
    // Check that at least ONE section has data
    const hasAnySections = !!(body.copy || body.creative || body.destination || body.location || body.budget)
    
    if (!hasAnySections) {
      console.error(`[${traceId}] No data provided in request`)
      return NextResponse.json(
        { success: false, error: 'No data provided to save' } as SaveAdResponse,
        { status: 400 }
      )
    }

    console.log(`[${traceId}] Partial save request:`, {
      hasCopy: !!body.copy,
      hasCreative: !!body.creative,
      hasDestination: !!body.destination,
      hasLocation: !!body.location,
      hasBudget: !!body.budget
    })

    // Validate copy data IF provided
    if (body.copy) {
      if (body.copy.variations && body.copy.variations.length > 0) {
        // Validate each variation has required fields
        const invalidVariation = body.copy.variations.find((v: { headline?: string; primaryText?: string }) => 
          !v.headline || !v.primaryText
        )
        if (invalidVariation) {
          return NextResponse.json(
            { success: false, error: 'Copy variations must include headline and primaryText' } as SaveAdResponse,
            { status: 400 }
          )
        }
      }
    }

    // Validate creative data IF provided
    if (body.creative) {
      if (!body.creative.imageVariations || body.creative.imageVariations.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Creative must include at least one image variation' } as SaveAdResponse,
          { status: 400 }
        )
      }
    }

    // Validate destination data IF provided
    if (body.destination) {
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
    }

    console.log(`[${traceId}] Validation passed, saving provided sections to normalized tables`)

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
          creative_format: (body.creative?.format as string) || 'feed',
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
          cta_text: body.copy?.cta || body.destination?.cta || 'Learn More',
          is_selected: idx === (body.copy?.selectedCopyIndex || 0),
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

      // 4. Save locations (if provided)
      if (body.location && (body.location as { locations?: unknown[] }).locations) {
        const locations = (body.location as { locations: unknown[] }).locations
        if (Array.isArray(locations) && locations.length > 0) {
          // Delete existing locations for this ad
          await supabaseServer
            .from('ad_target_locations')
            .delete()
            .eq('ad_id', adId)

          // Insert new locations
          const locationInserts = (locations as Array<{
            name: string
            type: string
            coordinates?: [number, number]
            radius?: number
            mode?: string
            key?: string
            bbox?: [number, number, number, number]
            geometry?: object
          }>).map((loc) => ({
            ad_id: adId,
            location_name: loc.name,
            location_type: loc.type || 'city',
            latitude: loc.coordinates?.[0] || null,
            longitude: loc.coordinates?.[1] || null,
            radius_km: loc.radius || null,
            targeting_mode: loc.mode || 'include',
            meta_location_key: loc.key || null,
            bbox: loc.bbox ? (loc.bbox as Json) : null,
            geometry: loc.geometry ? (loc.geometry as Json) : null,
          }))

          const { error: locationError } = await supabaseServer
            .from('ad_target_locations')
            .insert(locationInserts)

          if (locationError) {
            console.error(`[${traceId}] Failed to save locations:`, locationError)
            throw new Error('Failed to save locations')
          }
          
          console.log(`[${traceId}] Saved ${locations.length} locations`)
        }
      }

      // 5. Save budget (if provided)
      if (body.budget) {
        const budgetData = body.budget as {
          dailyBudget?: number
          currency?: string
          startTime?: string
          endTime?: string
          timezone?: string
        }
        
        if (budgetData.dailyBudget && budgetData.dailyBudget > 0) {
          await supabaseServer
            .from('ad_budgets')
            .upsert({
              ad_id: adId,
              daily_budget_cents: Math.round(budgetData.dailyBudget * 100),
              currency_code: budgetData.currency || 'USD',
              start_time: budgetData.startTime || null,
              end_time: budgetData.endTime || null,
              timezone: budgetData.timezone || 'America/Los_Angeles',
            }, { onConflict: 'ad_id' })

          console.log(`[${traceId}] Saved budget: ${budgetData.dailyBudget} ${budgetData.currency || 'USD'}`)
        }
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

