/**
 * Feature: Targeting Service Contract
 * Purpose: Interface for location targeting and geocoding
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 *  - OpenStreetMap Nominatim API: Geocoding
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Targeting Types
// ============================================================================

export interface Location {
  id: string;
  name: string; // Full display name (e.g., "Toronto, Ontario, Canada")
  coordinates: [number, number]; // [longitude, latitude]
  radius?: number; // For radius-based targeting (miles)
  type: 'city' | 'region' | 'country' | 'radius';
  mode: 'include' | 'exclude';
  bbox?: [number, number, number, number]; // Bounding box
  geometry?: GeoJSONGeometry; // Boundary shape
  key?: string; // Meta location key (required for publishing)
  country_code?: string; // ISO country code
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

export interface AddLocationsInput {
  adId: string;
  locations: Array<{
    name: string;
    type: Location['type'];
    mode: Location['mode'];
    radius?: number;
  }>;
}

export interface AddLocationsResult {
  locations: Location[];
  count: number;
}

export interface RemoveLocationInput {
  adId: string;
  locationId: string;
}

export interface GeocodeInput {
  locationName: string;
  type?: Location['type'];
}

export interface GeocodeResult {
  name: string;
  coordinates: [number, number];
  bbox?: [number, number, number, number];
  country_code?: string;
}

export interface FetchBoundaryInput {
  locationName: string;
  type: Location['type'];
}

export interface FetchBoundaryResult {
  geometry: GeoJSONGeometry;
}

// ============================================================================
// Targeting Service Interface
// ============================================================================

export interface TargetingService {
  /**
   * Add locations to ad targeting
   * Geocodes location names and fetches boundaries
   */
  addLocations: ServiceContract<AddLocationsInput, ServiceResult<AddLocationsResult>>;

  /**
   * Remove location from ad targeting
   */
  removeLocation: ServiceContract<RemoveLocationInput, ServiceResult<void>>;

  /**
   * Clear all locations for an ad
   */
  clearLocations: ServiceContract<string, ServiceResult<void>>;

  /**
   * Get locations for an ad
   */
  getLocations: ServiceContract<string, ServiceResult<Location[]>>;

  /**
   * Geocode location name to coordinates
   * Uses OpenStreetMap Nominatim API
   */
  geocode: ServiceContract<GeocodeInput, ServiceResult<GeocodeResult>>;

  /**
   * Fetch location boundary geometry
   * For displaying on map
   */
  fetchBoundary: ServiceContract<FetchBoundaryInput, ServiceResult<FetchBoundaryResult>>;

  /**
   * Lookup Meta location key
   * Required for publishing (not yet implemented)
   */
  lookupMetaLocationKey: ServiceContract<
    { locationName: string; type: Location['type'] },
    ServiceResult<{ key: string }>
  >;
}

