/**
 * Feature: Ad Data Service
 * Purpose: Centralized service for fetching/updating ad data from normalized tables
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { supabaseServer } from '@/lib/supabase/server'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types'

// ============================================
// Type Aliases for Convenience
// ============================================

export type Ad = Tables<'ads'>
export type AdCreative = Tables<'ad_creatives'>
export type AdCopyVariation = Tables<'ad_copy_variations'>
export type AdTargetLocation = Tables<'ad_target_locations'>
export type AdDestination = Tables<'ad_destinations'>
export type AdBudget = Tables<'ad_budgets'>

export type InsertAdCreative = TablesInsert<'ad_creatives'>
export type InsertAdCopyVariation = TablesInsert<'ad_copy_variations'>
export type InsertAdTargetLocation = TablesInsert<'ad_target_locations'>
export type InsertAdDestination = TablesInsert<'ad_destinations'>
export type InsertAdBudget = TablesInsert<'ad_budgets'>

// ============================================
// Complete Ad Data Structure
// ============================================

export interface CompleteAdData {
  ad: Ad
  creatives: AdCreative[]
  copyVariations: AdCopyVariation[]
  locations: AdTargetLocation[]
  destination: AdDestination | null
  budget: AdBudget | null
}

// ============================================
// Ad Data Service
// ============================================

export const adDataService = {
  /**
   * Get complete ad data with all relations
   * Returns all creatives, copy variations, locations, destination, and budget
   */
  async getCompleteAdData(adId: string): Promise<CompleteAdData | null> {
    try {
      const { data, error } = await supabaseServer
        .from('ads')
        .select(`
          *,
          ad_creatives!ad_creatives_ad_id_fkey (*),
          ad_copy_variations!ad_copy_variations_ad_id_fkey (*),
          ad_target_locations!ad_target_locations_ad_id_fkey (*),
          ad_destinations!ad_destinations_ad_id_fkey (*),
          ad_budgets!ad_budgets_ad_id_fkey (*)
        `)
        .eq('id', adId)
        .single()

      if (error) {
        console.error('[AdDataService] Get complete ad data error:', error)
        return null
      }

      // Type-safe extraction of related data
      // Note: ad_destinations and ad_budgets are one-to-one, not arrays
      const adData = data as Ad & {
        ad_creatives: AdCreative[]
        ad_copy_variations: AdCopyVariation[]
        ad_target_locations: AdTargetLocation[]
        ad_destinations: AdDestination | null
        ad_budgets: AdBudget | null
      }

      return {
        ad: data as Ad,
        creatives: adData.ad_creatives || [],
        copyVariations: adData.ad_copy_variations || [],
        locations: adData.ad_target_locations || [],
        destination: adData.ad_destinations || null,
        budget: adData.ad_budgets || null,
      }
    } catch (error) {
      console.error('[AdDataService] Get complete ad data exception:', error)
      return null
    }
  },

  /**
   * Get selected creative for an ad
   */
  async getSelectedCreative(adId: string): Promise<AdCreative | null> {
    try {
      const { data: ad, error: adError } = await supabaseServer
        .from('ads')
        .select('selected_creative_id')
        .eq('id', adId)
        .single()

      if (adError || !ad?.selected_creative_id) {
        return null
      }

      const { data, error } = await supabaseServer
        .from('ad_creatives')
        .select('*')
        .eq('id', ad.selected_creative_id)
        .single()

      if (error) {
        console.error('[AdDataService] Get selected creative error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('[AdDataService] Get selected creative exception:', error)
      return null
    }
  },

  /**
   * Get selected copy for an ad
   */
  async getSelectedCopy(adId: string): Promise<AdCopyVariation | null> {
    try {
      const { data, error } = await supabaseServer
        .from('ad_copy_variations')
        .select('*')
        .eq('ad_id', adId)
        .eq('is_selected', true)
        .single()

      if (error) {
        console.error('[AdDataService] Get selected copy error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('[AdDataService] Get selected copy exception:', error)
      return null
    }
  },

  /**
   * Get all creatives for an ad
   */
  async getCreatives(adId: string, format?: string): Promise<AdCreative[]> {
    try {
      let query = supabaseServer
        .from('ad_creatives')
        .select('*')
        .eq('ad_id', adId)

      if (format) {
        query = query.eq('creative_format', format)
      }

      const { data, error } = await query.order('sort_order')

      if (error) {
        console.error('[AdDataService] Get creatives error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[AdDataService] Get creatives exception:', error)
      return []
    }
  },

  /**
   * Get all copy variations for an ad
   */
  async getCopyVariations(adId: string): Promise<AdCopyVariation[]> {
    try {
      const { data, error } = await supabaseServer
        .from('ad_copy_variations')
        .select('*')
        .eq('ad_id', adId)
        .order('sort_order')

      if (error) {
        console.error('[AdDataService] Get copy variations error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[AdDataService] Get copy variations exception:', error)
      return []
    }
  },

  /**
   * Save a single creative
   */
  async saveCreative(
    adId: string,
    creative: Omit<InsertAdCreative, 'ad_id'>
  ): Promise<AdCreative | null> {
    try {
      const { data, error } = await supabaseServer
        .from('ad_creatives')
        .insert({ ...creative, ad_id: adId })
        .select()
        .single()

      if (error) {
        console.error('[AdDataService] Save creative error:', error)
        return null
      }

      // Optionally set as selected if it's the first/base image
      if (creative.is_base_image) {
        await supabaseServer
          .from('ads')
          .update({ selected_creative_id: data.id })
          .eq('id', adId)
      }

      return data
    } catch (error) {
      console.error('[AdDataService] Save creative exception:', error)
      return null
    }
  },

  /**
   * Save multiple creatives (bulk insert)
   */
  async saveCreatives(
    adId: string,
    creatives: Omit<InsertAdCreative, 'ad_id'>[],
    selectedIndex?: number
  ): Promise<AdCreative[]> {
    try {
      // Delete old creatives to avoid unique constraint violations
      await supabaseServer
        .from('ad_creatives')
        .delete()
        .eq('ad_id', adId)
      
      const inserts = creatives.map((c) => ({ ...c, ad_id: adId }))
      
      const { data, error } = await supabaseServer
        .from('ad_creatives')
        .insert(inserts)
        .select()

      if (error) {
        console.error('[AdDataService] Save creatives error:', error)
        return []
      }

      // Set selected creative
      if (selectedIndex !== undefined && data && data[selectedIndex]) {
        await supabaseServer
          .from('ads')
          .update({ selected_creative_id: data[selectedIndex].id })
          .eq('id', adId)
      }

      return data || []
    } catch (error) {
      console.error('[AdDataService] Save creatives exception:', error)
      return []
    }
  },

  /**
   * Save copy variations (replaces all existing variations)
   */
  async saveCopyVariations(
    adId: string,
    variations: Omit<InsertAdCopyVariation, 'ad_id' | 'is_selected' | 'sort_order'>[],
    selectedIndex: number
  ): Promise<AdCopyVariation[]> {
    try {
      // Delete old variations
      await supabaseServer
        .from('ad_copy_variations')
        .delete()
        .eq('ad_id', adId)

      // Insert new variations
      const inserts = variations.map((v, idx) => ({
        ...v,
        ad_id: adId,
        is_selected: idx === selectedIndex,
        sort_order: idx,
      }))

      const { data, error } = await supabaseServer
        .from('ad_copy_variations')
        .insert(inserts)
        .select()

      if (error) {
        console.error('[AdDataService] Save copy variations error:', error)
        return []
      }

      // Set selected copy ID on ads table
      const selected = data?.find((c) => c.is_selected)
      if (selected) {
        await supabaseServer
          .from('ads')
          .update({ selected_copy_id: selected.id })
          .eq('id', adId)
      }

      return data || []
    } catch (error) {
      console.error('[AdDataService] Save copy variations exception:', error)
      return []
    }
  },

  /**
   * Update which copy is selected
   */
  async selectCopyVariation(adId: string, copyId: string): Promise<boolean> {
    try {
      // Unselect all current variations
      await supabaseServer
        .from('ad_copy_variations')
        .update({ is_selected: false })
        .eq('ad_id', adId)

      // Select the new one
      await supabaseServer
        .from('ad_copy_variations')
        .update({ is_selected: true })
        .eq('id', copyId)

      // Update ads table
      await supabaseServer
        .from('ads')
        .update({ selected_copy_id: copyId })
        .eq('id', adId)

      return true
    } catch (error) {
      console.error('[AdDataService] Select copy variation exception:', error)
      return false
    }
  },

  /**
   * Save locations (replaces all existing locations)
   */
  async saveLocations(
    adId: string,
    locations: Omit<InsertAdTargetLocation, 'ad_id'>[]
  ): Promise<AdTargetLocation[]> {
    try {
      // Delete old locations
      await supabaseServer
        .from('ad_target_locations')
        .delete()
        .eq('ad_id', adId)

      // Insert new locations
      const inserts = locations.map((loc) => ({ ...loc, ad_id: adId }))

      const { data, error } = await supabaseServer
        .from('ad_target_locations')
        .insert(inserts)
        .select()

      if (error) {
        console.error('[AdDataService] Save locations error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[AdDataService] Save locations exception:', error)
      return []
    }
  },

  /**
   * Save destination (upsert)
   */
  async saveDestination(
    adId: string,
    destination: Omit<InsertAdDestination, 'ad_id'>
  ): Promise<AdDestination | null> {
    try {
      const { data, error } = await supabaseServer
        .from('ad_destinations')
        .upsert({ ...destination, ad_id: adId }, { onConflict: 'ad_id' })
        .select()
        .single()

      if (error) {
        console.error('[AdDataService] Save destination error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('[AdDataService] Save destination exception:', error)
      return null
    }
  },

  /**
   * Save budget (upsert)
   */
  async saveBudget(
    adId: string,
    budget: Omit<InsertAdBudget, 'ad_id'>
  ): Promise<AdBudget | null> {
    try {
      const { data, error } = await supabaseServer
        .from('ad_budgets')
        .upsert({ ...budget, ad_id: adId }, { onConflict: 'ad_id' })
        .select()
        .single()

      if (error) {
        console.error('[AdDataService] Save budget error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('[AdDataService] Save budget exception:', error)
      return null
    }
  },

  /**
   * Delete all ad data (cascade delete handles relations)
   */
  async deleteAd(adId: string): Promise<boolean> {
    try {
      const { error } = await supabaseServer
        .from('ads')
        .delete()
        .eq('id', adId)

      if (error) {
        console.error('[AdDataService] Delete ad error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('[AdDataService] Delete ad exception:', error)
      return false
    }
  },

  /**
   * Get all ads for a campaign with their data
   */
  async getCampaignAds(campaignId: string): Promise<CompleteAdData[]> {
    try {
      const { data, error } = await supabaseServer
        .from('ads')
        .select(`
          *,
          ad_creatives!ad_creatives_ad_id_fkey (*),
          ad_copy_variations!ad_copy_variations_ad_id_fkey (*),
          ad_target_locations!ad_target_locations_ad_id_fkey (*),
          ad_destinations!ad_destinations_ad_id_fkey (*),
          ad_budgets!ad_budgets_ad_id_fkey (*)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at')

      if (error) {
        console.error('[AdDataService] Get campaign ads error:', error)
        return []
      }

      // Transform to CompleteAdData structure
      return (data || []).map((ad) => {
        const adData = ad as Ad & {
          ad_creatives: AdCreative[]
          ad_copy_variations: AdCopyVariation[]
          ad_target_locations: AdTargetLocation[]
          ad_destinations: AdDestination | null
          ad_budgets: AdBudget | null
        }

        return {
          ad: ad as Ad,
          creatives: adData.ad_creatives || [],
          copyVariations: adData.ad_copy_variations || [],
          locations: adData.ad_target_locations || [],
          destination: adData.ad_destinations || null,
          budget: adData.ad_budgets || null,
        }
      })
    } catch (error) {
      console.error('[AdDataService] Get campaign ads exception:', error)
      return []
    }
  },

  /**
   * Build snapshot object for frontend compatibility
   * ARCHITECTURE NOTE: This builds a RUNTIME snapshot from normalized database tables.
   * NO setup_snapshot column exists in database - this is an in-memory transformation.
   * 
   * Data Flow:
   * 1. Database: Normalized tables (ad_creatives, ad_copy_variations, ad_target_locations, etc.)
   * 2. This function: Reads normalized data → builds snapshot object
   * 3. API returns: Ephemeral snapshot (not stored in database)
   * 4. Frontend: Consumes snapshot, updates tables via PATCH /snapshot endpoint
   * 
   * Single Source of Truth: ad_target_locations TABLE (not JSON column)
   */
  buildSnapshot(adData: CompleteAdData) {
    const selectedCreative = adData.creatives.find(
      (c) => c.id === adData.ad.selected_creative_id
    )
    const selectedCopyIndex = adData.copyVariations.findIndex(
      (c) => c.is_selected
    )

    return {
      creative: {
        imageUrl: selectedCreative?.image_url,
        imageVariations: adData.creatives.map((c) => c.image_url),
        baseImageUrl: adData.creatives.find((c) => c.is_base_image)?.image_url,
        selectedImageIndex: adData.creatives.findIndex(
          (c) => c.id === adData.ad.selected_creative_id
        ),
        format: selectedCreative?.creative_format || 'feed',
      },
      copy: {
        variations: adData.copyVariations.map((v) => ({
          headline: v.headline,
          primaryText: v.primary_text,
          description: v.description || '',
          cta: v.cta_text,
          overlay: {
            headline: v.overlay_headline,
            offer: v.overlay_offer,
            body: v.overlay_body,
            density: v.overlay_density,
          },
        })),
        selectedCopyIndex: selectedCopyIndex >= 0 ? selectedCopyIndex : 0,
      },
      // ARCHITECTURE: Built from ad_target_locations TABLE (source of truth)
      location: {
        locations: adData.locations.map((l) => ({
          id: l.meta_location_key || `loc-${l.id}`,
          name: l.location_name,
          type: l.location_type,
          coordinates: [l.longitude || 0, l.latitude || 0] as [number, number],
          radius: l.radius_km ? l.radius_km / 1.60934 : undefined, // Convert km back to miles
          mode: l.inclusion_mode as 'include' | 'exclude',
          key: l.meta_location_key,
          // Note: bbox and geometry not stored in DB, will need re-geocoding on load
        })),
      },
      destination: adData.destination
        ? {
            type: adData.destination.destination_type,
            data: {
              formId: adData.destination.instant_form_id,
              websiteUrl: adData.destination.website_url,
              displayLink: adData.destination.display_link,
              phoneNumber: adData.destination.phone_number,
              phoneFormatted: adData.destination.phone_formatted,
            },
          }
        : null,
      budget: adData.budget
        ? {
            dailyBudget: adData.budget.daily_budget_cents / 100,
            currency: adData.budget.currency_code,
            startTime: adData.budget.start_date,
            endTime: adData.budget.end_date,
            timezone: adData.budget.timezone,
          }
        : null,
    }
  },
}

