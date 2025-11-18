/**
 * Feature: Ad Snapshot API
 * Purpose: Build ad snapshot from normalized tables for frontend compatibility
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { adDataService } from '@/lib/services/ad-data-service'

/**
 * Calculate which wizard steps are complete based on snapshot data
 * Returns array of completed step IDs: ["ads", "copy", "destination", "location"]
 */
function calculateCompletedSteps(snapshot: {
  creative?: { imageVariations?: string[]; selectedImageIndex?: number | null };
  copy?: { variations?: unknown[]; selectedCopyIndex?: number | null };
  destination?: { type?: string } | null;
  location?: { locations?: unknown[] };
  budget?: { dailyBudget?: number } | null;
}): string[] {
  const completedSteps: string[] = [];

  // Creative step complete if: has variations AND selected one
  if (
    Array.isArray(snapshot.creative?.imageVariations) &&
    snapshot.creative.imageVariations.length > 0 &&
    snapshot.creative.selectedImageIndex != null &&
    snapshot.creative.selectedImageIndex >= 0
  ) {
    completedSteps.push('ads');
  }

  // Copy step complete if: has variations AND selected one
  if (
    Array.isArray(snapshot.copy?.variations) &&
    snapshot.copy.variations.length > 0 &&
    snapshot.copy.selectedCopyIndex != null &&
    snapshot.copy.selectedCopyIndex >= 0
  ) {
    completedSteps.push('copy');
  }

  // Destination step complete if: has destination type
  if (snapshot.destination && snapshot.destination.type) {
    completedSteps.push('destination');
  }

  // Location step complete if: has at least one location
  if (
    Array.isArray(snapshot.location?.locations) &&
    snapshot.location.locations.length > 0
  ) {
    completedSteps.push('location');
  }

  return completedSteps;
}

// GET /api/campaigns/[id]/ads/[adId]/snapshot - Build snapshot from normalized tables
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this campaign
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch complete ad data
    const adData = await adDataService.getCompleteAdData(adId)

    if (!adData) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    // Build snapshot from normalized data
    const snapshot = adDataService.buildSnapshot(adData)

    // Calculate completed steps
    const completedSteps = calculateCompletedSteps(snapshot)

    return NextResponse.json({ 
      success: true,
      setup_snapshot: snapshot,
      completed_steps: completedSteps // NEW: Return completed steps
    })
  } catch (error) {
    console.error('[GET snapshot] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/campaigns/[id]/ads/[adId]/snapshot - Update ad data
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; adId: string }> }
) {
  try {
    const { id: campaignId, adId } = await context.params
    const body = await request.json()

    console.log('[PATCH snapshot] Updating ad data:', {
      campaignId,
      adId,
      sections: Object.keys(body)
    })

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this campaign
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update different sections based on what's provided
    if (body.creative) {
      // Validate creative data
      const creativeData = body.creative
      if (!Array.isArray(creativeData.imageVariations) || creativeData.imageVariations.length === 0) {
        return NextResponse.json({ error: 'Creative requires non-empty imageVariations array' }, { status: 400 })
      }
      
      // Use existing adDataService method (updates selected_creative_id FK automatically)
      const creatives = creativeData.imageVariations.map((url: string, idx: number) => ({
        creative_format: creativeData.format || 'feed',
        image_url: url,
        is_base_image: idx === 0,
        sort_order: idx
      }))
      
      await adDataService.saveCreatives(adId, creatives, creativeData.selectedImageIndex ?? 0)
      
      // Verify FK was updated
      const { data: adCheck } = await supabaseServer
        .from('ads')
        .select('selected_creative_id')
        .eq('id', adId)
        .single()
      
      console.log('[PATCH snapshot] ✅ Creative saved and FK updated:', {
        adId,
        selectedIndex: creativeData.selectedImageIndex ?? 0,
        fkId: adCheck?.selected_creative_id
      })
    }

    if (body.copy) {
      // Validate copy data
      const copyData = body.copy
      if (!Array.isArray(copyData.variations)) {
        return NextResponse.json({ error: 'Copy requires variations array' }, { status: 400 })
      }
      
      // Validate each variation only if array is not empty
      if (copyData.variations.length > 0) {
        const hasInvalid = copyData.variations.some((v: { headline?: string; primaryText?: string }) => !v.headline || !v.primaryText)
        if (hasInvalid) {
          return NextResponse.json({ error: 'Each variation must have headline and primaryText' }, { status: 400 })
        }
        
        // Use existing adDataService method (updates selected_copy_id FK automatically)
        const variations = copyData.variations.map((v: { headline: string; primaryText: string; description: string; cta: string }) => ({
          headline: v.headline,
          primary_text: v.primaryText,
          description: v.description || '',
          cta_text: v.cta || 'Learn More'
        }))
        
        await adDataService.saveCopyVariations(adId, variations, copyData.selectedCopyIndex || 0)
        
        // Verify FK was updated
        const { data: adCheck2 } = await supabaseServer
          .from('ads')
          .select('selected_copy_id')
          .eq('id', adId)
          .single()
        
        console.log('[PATCH snapshot] ✅ Copy saved and FK updated:', {
          adId,
          selectedIndex: copyData.selectedCopyIndex || 0,
          fkId: adCheck2?.selected_copy_id
        })
      }
    }

    // ARCHITECTURE: Save to ad_target_locations TABLE (single source of truth)
    // NO setup_snapshot column - locations stored in normalized table
    if (body.location) {
      const locationData = body.location
      
      if (!locationData.locations || !Array.isArray(locationData.locations)) {
        return NextResponse.json({ error: 'Location data must include locations array' }, { status: 400 })
      }
      
      console.log('[PATCH snapshot] Saving to ad_target_locations table:', {
        adId,
        count: locationData.locations.length,
        sample: locationData.locations[0]
      })
      
      // Validate coordinate format
      for (const loc of locationData.locations) {
        if (loc.coordinates && Array.isArray(loc.coordinates)) {
          const [lng, lat] = loc.coordinates
          if (typeof lng !== 'number' || typeof lat !== 'number') {
            return NextResponse.json({ 
              error: `Invalid coordinates for ${loc.name}: must be [longitude, latitude] numbers` 
            }, { status: 400 })
          }
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return NextResponse.json({ 
              error: `Coordinates out of range for ${loc.name}: lat=${lat}, lng=${lng}` 
            }, { status: 400 })
          }
        }
      }
      
      // Transaction: delete old + insert new (ensures consistency)
      const { error: deleteError } = await supabaseServer
        .from('ad_target_locations')
        .delete()
        .eq('ad_id', adId)
      
      if (deleteError) {
        console.error('[PATCH snapshot] Delete error:', deleteError)
        return NextResponse.json({ error: 'Failed to clear old locations' }, { status: 500 })
      }
      
      if (locationData.locations.length > 0) {
        const locationInserts = locationData.locations.map((loc: {
          name: string
          type: string
          coordinates?: [number, number]
          radius?: number
          mode?: string
          key?: string
        }) => ({
          ad_id: adId,
          location_name: loc.name,
          location_type: loc.type,
          longitude: loc.coordinates?.[0] || null,
          latitude: loc.coordinates?.[1] || null,
          radius_km: loc.radius ? loc.radius * 1.60934 : null, // Convert miles to km
          inclusion_mode: loc.mode || 'include',
          meta_location_key: loc.key || null
        }))
        
        const { data: inserted, error: insertError } = await supabaseServer
          .from('ad_target_locations')
          .insert(locationInserts)
          .select()
        
        if (insertError) {
          console.error('[PATCH snapshot] Insert error:', insertError)
          return NextResponse.json({ 
            error: 'Failed to save locations to ad_target_locations table',
            details: insertError.message 
          }, { status: 500 })
        }
        
        console.log('[PATCH snapshot] ✅ Saved locations to ad_target_locations table:', inserted?.length)
      }
    }

    if (body.destination) {
      // Validate destination data
      const destData = body.destination
      if (!destData.type) {
        return NextResponse.json({ error: 'Destination requires type' }, { status: 400 })
      }
      
      // Save destination data
      let destinationType = 'website_url'
      if (destData.type === 'instant_form') destinationType = 'instant_form'
      if (destData.type === 'phone_number') destinationType = 'phone_number'

      await supabaseServer
        .from('ad_destinations')
        .upsert({
          ad_id: adId,
          destination_type: destinationType,
          instant_form_id: destData.data?.formId || null,
          website_url: destData.data?.websiteUrl || null,
          display_link: destData.data?.displayLink || null,
          phone_number: destData.data?.phoneNumber || null,
          phone_formatted: destData.data?.phoneFormatted || null
        }, { onConflict: 'ad_id' })
    }

    if (body.budget) {
      // Save budget data
      const budgetData = body.budget
      await supabaseServer
        .from('ad_budgets')
        .upsert({
          ad_id: adId,
          daily_budget_cents: Math.round(budgetData.dailyBudget * 100),
          currency_code: budgetData.currency || 'USD',
          start_date: budgetData.startTime || null,
          end_date: budgetData.endTime || null,
          timezone: budgetData.timezone || 'America/New_York'
        }, { onConflict: 'ad_id' })
    }

    // Calculate completed steps from saved snapshot data
    const adData = await adDataService.getCompleteAdData(adId)
    const snapshot = adData ? adDataService.buildSnapshot(adData) : null
    const completedSteps = snapshot ? calculateCompletedSteps(snapshot) : []

    // Update ad's updated_at timestamp AND completed_steps
    await supabaseServer
      .from('ads')
      .update({ 
        updated_at: new Date().toISOString(),
        completed_steps: completedSteps
      })
      .eq('id', adId)

    console.log('[PATCH snapshot] Snapshot updated successfully', {
      completedSteps,
      sectionsUpdated: Object.keys(body)
    })

    // Fetch and return updated snapshot with completed steps
    const updatedAdData = await adDataService.getCompleteAdData(adId)
    if (!updatedAdData) {
      return NextResponse.json({ error: 'Failed to fetch updated ad' }, { status: 500 })
    }

    const updatedSnapshot = adDataService.buildSnapshot(updatedAdData)

    return NextResponse.json({
      success: true,
      setup_snapshot: updatedSnapshot,
      completed_steps: completedSteps // NEW: Return completed steps to client
    })
  } catch (error) {
    console.error('[PATCH snapshot] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
