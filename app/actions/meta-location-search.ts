"use server"

/**
 * Feature: Meta Location Search
 * Purpose: Fetch Meta location keys required for targeting API
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api/targeting-search
 */

import { supabaseServer } from '@/lib/supabase/server'

interface MetaLocationResult {
  key: string // Meta location key (e.g., "2490299" for Toronto)
  name: string
  type: string
  country_code: string
  region?: string
  supports_region: boolean
  supports_city: boolean
}

/**
 * Search Meta Location API for location keys
 * Required for targeting API - locations need Meta keys to work
 * 
 * @param locationName - Full location name from geocoding
 * @param coordinates - [longitude, latitude] from geocoding  
 * @param locationType - Type of location (city/region/country)
 * @param campaignId - Optional campaign ID to get Meta token
 * @returns Meta location data with key, or null if not found
 */
export async function searchMetaLocation(
  locationName: string,
  coordinates: [number, number],
  locationType: 'city' | 'region' | 'country',
  campaignId?: string
): Promise<MetaLocationResult | null> {
  try {
    // Get current user
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      console.warn('[Meta Location] No authenticated user')
      return null
    }
    
    // TODO: Implement Meta Graph API integration
    // In production, this would call:
    // GET https://graph.facebook.com/v24.0/search
    // Parameters:
    //   type=adgeolocation
    //   q={locationName}
    //   location_types=["city"|"region"|"country"]
    //   access_token={token from campaign_meta_connections}
    //
    // For now, we'll log and return null (geocoding will work without Meta keys,
    // but publishing will require them)
    
    console.warn(
      '[Meta Location] Meta API integration needed for:', 
      locationName, 
      `(${locationType})`
    )
    console.log('[Meta Location] Coordinates:', coordinates)
    console.log('[Meta Location] Note: Publishing will require Meta location keys to be implemented')
    
    // Return null for now - this will be filled in when Meta API is integrated
    return null
    
  } catch (error) {
    console.error('[Meta Location] Search failed:', error)
    return null
  }
}

/**
 * Batch search multiple locations
 * More efficient than individual searches
 */
export async function searchMetaLocations(
  locations: Array<{
    name: string
    coordinates: [number, number]
    type: 'city' | 'region' | 'country'
  }>,
  campaignId?: string
): Promise<Map<string, MetaLocationResult | null>> {
  const results = new Map<string, MetaLocationResult | null>()
  
  // Process all locations in parallel
  await Promise.all(
    locations.map(async (loc) => {
      const result = await searchMetaLocation(
        loc.name,
        loc.coordinates,
        loc.type,
        campaignId
      )
      results.set(loc.name, result)
    })
  )
  
  return results
}

