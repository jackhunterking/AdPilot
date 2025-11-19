/**
 * Feature: Targeting Service Client (Full Implementation)
 * Purpose: Client-side targeting operations
 * Microservices: Client service layer calling API routes and server actions
 * References:
 *  - Contract: lib/services/contracts/targeting-service.interface.ts
 *  - API v1: app/api/v1/ads/[id]/locations
 *  - Server Actions: app/actions/geocoding.ts, app/actions/meta-location-search.ts
 */

"use client";

import type { 
  TargetingService,
  AddLocationsInput,
  AddLocationsResult,
  RemoveLocationInput,
  Location,
  GeocodeInput,
  GeocodeResult,
  FetchBoundaryInput,
  FetchBoundaryResult,
} from '../contracts/targeting-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';
import { searchLocations, getLocationBoundary } from '@/app/actions/geocoding';
import { searchMetaLocation } from '@/app/actions/meta-location-search';

/**
 * Targeting Service Client (Full Implementation)
 * 
 * Client-side implementation that calls API v1 location endpoints and server actions.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/ads/[id]/locations endpoints
 * - Uses server actions for geocoding and boundary fetching
 * - Returns standardized ServiceResult<T>
 * - Type-safe request/response handling
 */
class TargetingServiceClient implements TargetingService {
  addLocations = {
    async execute(input: AddLocationsInput): Promise<ServiceResult<AddLocationsResult>> {
      try {
        const response = await fetch(`/api/v1/ads/${input.adId}/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            locations: input.locations,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { locations: Location[]; count: number } };
        return {
          success: true,
          data: {
            locations: successResult.data.locations,
            count: successResult.data.count,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to add locations',
          },
        };
      }
    }
  };

  removeLocation = {
    async execute(input: RemoveLocationInput): Promise<ServiceResult<void>> {
      try {
        const response = await fetch(`/api/v1/ads/${input.adId}/locations/${input.locationId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to remove location',
          },
        };
      }
    }
  };

  clearLocations = {
    async execute(adId: string): Promise<ServiceResult<void>> {
      try {
        const response = await fetch(`/api/v1/ads/${adId}/locations`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to clear locations',
          },
        };
      }
    }
  };

  getLocations = {
    async execute(adId: string): Promise<ServiceResult<Location[]>> {
      try {
        const response = await fetch(`/api/v1/ads/${adId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { 
          success: true; 
          data: { ad: { setup_snapshot?: { location?: { locations?: Location[] } } } } 
        };
        const locations = successResult.data.ad.setup_snapshot?.location?.locations || [];
        
        return {
          success: true,
          data: locations,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to get locations',
          },
        };
      }
    }
  };

  geocode = {
    async execute(input: GeocodeInput): Promise<ServiceResult<GeocodeResult>> {
      try {
        // Call server action
        const result = await searchLocations(input.locationName);
        
        if (!result.success || !result.data) {
          return {
            success: false,
            error: {
              code: result.error?.code || 'geocode_failed',
              message: result.error?.message || 'Failed to geocode location',
            },
          };
        }
        
        return {
          success: true,
          data: {
            name: result.data.place_name,
            coordinates: result.data.center,
            bbox: result.data.bbox || undefined,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'geocode_error',
            message: error instanceof Error ? error.message : 'Failed to geocode location',
          },
        };
      }
    }
  };

  fetchBoundary = {
    async execute(input: FetchBoundaryInput): Promise<ServiceResult<FetchBoundaryResult>> {
      try {
        // First geocode to get coordinates
        const geocodeResult = await searchLocations(input.locationName);
        
        if (!geocodeResult.success || !geocodeResult.data) {
          return {
            success: false,
            error: {
              code: 'geocode_failed',
              message: 'Failed to geocode location before fetching boundary',
            },
          };
        }
        
        // Call server action with coordinates
        const result = await getLocationBoundary(geocodeResult.data.center, input.locationName);
        
        if (!result) {
          return {
            success: false,
            error: {
              code: 'boundary_fetch_failed',
              message: 'Failed to fetch boundary',
            },
          };
        }
        
        return {
          success: true,
          data: {
            geometry: result.geometry,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'boundary_error',
            message: error instanceof Error ? error.message : 'Failed to fetch boundary',
          },
        };
      }
    }
  };

  lookupMetaLocationKey = {
    async execute(input: { locationName: string; type: Location['type'] }): Promise<ServiceResult<{ key: string }>> {
      try {
        // First geocode to get coordinates
        const geocodeResult = await searchLocations(input.locationName);
        
        if (!geocodeResult.success || !geocodeResult.data) {
          return {
            success: false,
            error: {
              code: 'geocode_failed',
              message: 'Failed to geocode location',
            },
          };
        }
        
        // Call server action with coordinates  
        const locationType = input.type === 'radius' ? 'city' : input.type;
        const result = await searchMetaLocation(input.locationName, geocodeResult.data.center, locationType);
        
        if (!result || !result.key) {
          return {
            success: false,
            error: {
              code: 'meta_location_not_found',
              message: 'Failed to lookup Meta location key',
            },
          };
        }
        
        return {
          success: true,
          data: {
            key: result.key,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'meta_location_error',
            message: error instanceof Error ? error.message : 'Failed to lookup Meta location key',
          },
        };
      }
    }
  };
}

export const targetingServiceClient = new TargetingServiceClient();

