/**
 * Feature: Targeting Service Server Implementation
 * Purpose: Server-side location targeting with geocoding
 * References:
 *  - Targeting Service Contract: lib/services/contracts/targeting-service.interface.ts
 *  - Nominatim API: https://nominatim.org/release-docs/latest/api/Search/
 *  - Supabase: https://supabase.com/docs
 */

import { supabaseServer } from '@/lib/supabase/server';
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
    async execute(_input: GeocodeInput): Promise<ServiceResult<GeocodeResult>> {
      try {
        // TODO: Implement Nominatim API call for geocoding
        // For now, return stub
        throw new Error('Not implemented - Nominatim geocoding');
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
    async execute(_input: FetchBoundaryInput): Promise<ServiceResult<FetchBoundaryResult>> {
      try {
        // TODO: Implement boundary fetching from OSM or similar service
        // For now, return stub
        throw new Error('Not implemented - Boundary fetching');
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
    async execute(_input: { locationName: string; type: string }): Promise<ServiceResult<{ key: string }>> {
      try {
        // TODO: Implement Meta Location Search API call
        // https://developers.facebook.com/docs/marketing-api/targeting-specs
        throw new Error('Not implemented - Meta location key lookup');
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

