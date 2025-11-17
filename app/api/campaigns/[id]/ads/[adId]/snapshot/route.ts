/**
 * Feature: Ad Snapshot API
 * Purpose: Build ad snapshot from normalized tables for frontend compatibility
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { adDataService } from '@/lib/services/ad-data-service'

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

    return NextResponse.json({ 
      success: true,
      setup_snapshot: snapshot 
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
      
      // Save creative data
      if (creativeData.imageVariations && creativeData.imageVariations.length > 0) {
        // Delete existing creatives
        await supabaseServer
          .from('ad_creatives')
          .delete()
          .eq('ad_id', adId)

        // Insert new creatives
        const creativeInserts = creativeData.imageVariations.map((url: string, idx: number) => ({
          ad_id: adId,
          creative_format: creativeData.format || 'feed',
          image_url: url,
          is_base_image: idx === 0,
          sort_order: idx
        }))

        await supabaseServer
          .from('ad_creatives')
          .insert(creativeInserts)
      }
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
      }
      
      // Save copy data
      if (copyData.variations && copyData.variations.length > 0) {
        // Delete existing copy
        await supabaseServer
          .from('ad_copy_variations')
          .delete()
          .eq('ad_id', adId)

        // Insert new copy variations
        const copyInserts = copyData.variations.map((v: { headline: string; primaryText: string; description: string; cta: string }, idx: number) => ({
          ad_id: adId,
          headline: v.headline,
          primary_text: v.primaryText,
          description: v.description || null,
          cta_text: v.cta || 'Learn More',
          is_selected: idx === (copyData.selectedCopyIndex || 0),
          sort_order: idx
        }))

        await supabaseServer
          .from('ad_copy_variations')
          .insert(copyInserts)
      }
    }

    if (body.location) {
      // Save location data
      const locationData = body.location
      if (locationData.locations && locationData.locations.length > 0) {
        // Delete existing locations
        await supabaseServer
          .from('ad_target_locations')
          .delete()
          .eq('ad_id', adId)

        // Insert new locations
        const locationInserts = locationData.locations.map((loc: {
          name: string
          type: string
          coordinates?: [number, number]
          radius?: number
          mode?: string
          id?: string
        }) => ({
          ad_id: adId,
          location_name: loc.name,
          location_type: loc.type,
          latitude: loc.coordinates?.[0] || null,
          longitude: loc.coordinates?.[1] || null,
          radius_km: loc.radius || null,
          inclusion_mode: loc.mode || 'include',
          meta_location_key: loc.id || null
        }))

        await supabaseServer
          .from('ad_target_locations')
          .insert(locationInserts)
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

    // Update ad's updated_at timestamp
    await supabaseServer
      .from('ads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', adId)

    console.log('[PATCH snapshot] Snapshot updated successfully')

    // Fetch and return updated snapshot
    const adData = await adDataService.getCompleteAdData(adId)
    if (!adData) {
      return NextResponse.json({ error: 'Failed to fetch updated ad' }, { status: 500 })
    }

    const snapshot = adDataService.buildSnapshot(adData)

    return NextResponse.json({
      success: true,
      setup_snapshot: snapshot
    })
  } catch (error) {
    console.error('[PATCH snapshot] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
