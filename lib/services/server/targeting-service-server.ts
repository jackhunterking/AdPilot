/**
 * Feature: Targeting Service Server Implementation
 * Purpose: Server-side location targeting with geocoding
 * References:
 *  - Targeting Service Contract: lib/services/contracts/targeting-service.interface.ts
 *  - Nominatim API: https://nominatim.org/release-docs/latest/api/Search/
 *  - Supabase: https://supabase.com/docs
 */

import { supabaseServer, createServerClient } from '@/lib/supabase/server';
import { searchLocations, getLocationBoundary } from '@/app/actions/geocoding';
import type {
  TargetingService,
  Location,
  AddLocationsInput,
  AddLocationsResult,
  RemoveLocationInput,
  GeocodeInput,
  GeocodeResult,
  FetchBoundaryInput,
  FetchBoundaryResult,
} from '../contracts/targeting-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Targeting Service Server Implementation
 * Handles location targeting with geocoding and boundary fetching
 */
class TargetingServiceServer implements TargetingService {
  addLocations = {
    async execute(input: AddLocationsInput): Promise<ServiceResult<AddLocationsResult>> {
      try {
        // Insert locations into ad_target_locations table
        const locationInserts = input.locations.map((loc) => ({
          ad_id: input.adId,
          location_name: loc.name,
          location_type: loc.type,
          inclusion_mode: loc.mode,
          radius_km: loc.radius ? loc.radius * 1.60934 : null, // Convert miles to km
        }));

        const { data, error } = await supabaseServer
          .from('ad_target_locations')
          .insert(locationInserts)
          .select();

        if (error) {
          return {
            success: false,
            error: {
              code: 'creation_failed',
              message: error.message,
            },
          };
        }

        const locations: Location[] = (data || []).map((row) => ({
          id: row.id,
          name: row.location_name,
          coordinates: [row.longitude || 0, row.latitude || 0] as [number, number],
          radius: row.radius_km ? row.radius_km / 1.60934 : undefined,
          type: row.location_type as Location['type'],
          mode: row.inclusion_mode as Location['mode'],
          key: row.meta_location_key || undefined,
        }));

        return {
          success: true,
          data: {
            locations,
            count: locations.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  removeLocation = {
    async execute(input: RemoveLocationInput): Promise<ServiceResult<void>> {
      try {
        const { error } = await supabaseServer
          .from('ad_target_locations')
          .delete()
          .eq('id', input.locationId)
          .eq('ad_id', input.adId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'deletion_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  clearLocations = {
    async execute(adId: string): Promise<ServiceResult<void>> {
      try {
        const { error } = await supabaseServer
          .from('ad_target_locations')
          .delete()
          .eq('ad_id', adId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'deletion_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  getLocations = {
    async execute(adId: string): Promise<ServiceResult<Location[]>> {
      try {
        const { data, error } = await supabaseServer
          .from('ad_target_locations')
          .select('*')
          .eq('ad_id', adId)
          .order('created_at', { ascending: false });

        if (error) {
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: error.message,
            },
          };
        }

        const locations: Location[] = (data || []).map((row) => ({
          id: row.id,
          name: row.location_name,
          coordinates: [row.longitude || 0, row.latitude || 0] as [number, number],
          radius: row.radius_km ? row.radius_km / 1.60934 : undefined,
          type: row.location_type as Location['type'],
          mode: row.inclusion_mode as Location['mode'],
          bbox: row.bbox as [number, number, number, number] | undefined,
          geometry: row.geometry as unknown as Location['geometry'],
          key: row.meta_location_key || undefined,
        }));

        return {
          success: true,
          data: locations,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  geocode = {
    async execute(input: GeocodeInput): Promise<ServiceResult<GeocodeResult>> {
      try {
        // Use existing geocoding implementation from actions
        const result = await searchLocations(input.query);
        
        if (!result.success) {
          return {
            success: false,
            error: {
              code: result.error?.code || 'geocoding_failed',
              message: result.error?.message || 'Geocoding failed',
            },
          };
        }

        return {
          success: true,
          data: {
            placeName: result.data?.place_name || '',
            center: result.data?.center || [0, 0],
            bbox: result.data?.bbox || null,
            placeType: result.data?.place_type || [],
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'geocoding_failed',
            message: error instanceof Error ? error.message : 'Geocoding failed',
          },
        };
      }
    },
  };

  fetchBoundary = {
    async execute(input: FetchBoundaryInput): Promise<ServiceResult<FetchBoundaryResult>> {
      try {
        // Use existing boundary fetching implementation from actions
        const result = await fetchLocationBoundary(input.osmType, input.osmId);
        
        if (!result.success) {
          return {
            success: false,
            error: {
              code: result.error?.code || 'boundary_fetch_failed',
              message: result.error?.message || 'Boundary fetch failed',
            },
          };
        }

        return {
          success: true,
          data: {
            geometry: result.data?.geometry,
            bbox: result.data?.bbox || null,
            adminLevel: result.data?.adminLevel || 0,
            source: result.data?.source || 'osm',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'boundary_fetch_failed',
            message: error instanceof Error ? error.message : 'Boundary fetch failed',
          },
        };
      }
    },
  };

  lookupMetaLocationKey = {
    async execute(input: { locationName: string; type: string; campaignId?: string }): Promise<ServiceResult<{ key: string }>> {
      try {
        // Get Meta access token from campaign connection
        const supabase = await createServerClient();
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            error: { code: 'unauthorized', message: 'Not authenticated' }
          };
        }

        // Get Meta token (from meta_tokens table)
        const { data: tokenRow } = await supabase
          .from('meta_tokens')
          .select('token')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!tokenRow?.token) {
          return {
            success: false,
            error: { code: 'no_token', message: 'Meta token not found. Please connect Meta account first.' }
          };
        }

        // Call Meta Targeting Search API
        const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0';
        const searchUrl = `https://graph.facebook.com/${graphVersion}/search`;
        
        const params = new URLSearchParams({
          type: 'adgeolocation',
          location_types: input.type === 'city' ? 'city' : input.type === 'region' ? 'region' : 'country',
          q: input.locationName,
          access_token: tokenRow.token,
          limit: '1',
        });

        const response = await fetch(`${searchUrl}?${params.toString()}`);
        
        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: {
              code: 'meta_api_error',
              message: error.error?.message || 'Meta API request failed',
            }
          };
        }

        const result = await response.json();
        
        if (!result.data || result.data.length === 0) {
          return {
            success: false,
            error: { code: 'not_found', message: 'No Meta location key found for this location' }
          };
        }

        // Return first match key
        return {
          success: true,
          data: { key: result.data[0].key },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'lookup_failed',
            message: error instanceof Error ? error.message : 'Meta key lookup failed',
          },
        };
      }
    },
  };
}

// Export singleton instance
export const targetingServiceServer = new TargetingServiceServer();

