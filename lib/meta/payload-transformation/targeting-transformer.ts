/**
 * Feature: Targeting Transformer
 * Purpose: Transform location data to Meta API v24.0 targeting specifications
 * References:
 *  - Targeting Specs: https://developers.facebook.com/docs/marketing-api/targeting-specs
 *  - Geo Targeting: https://developers.facebook.com/docs/marketing-api/audiences/reference/basic-targeting#location
 */

import type { TargetingSpec, GeoLocation } from '../types/publishing';
import { TARGETING_DEFAULTS } from '../config/publishing-config';

// ============================================================================
// TYPES
// ============================================================================

export interface LocationItem {
  id: string;
  name: string;
  type: 'city' | 'region' | 'country' | 'radius';
  mode?: 'include' | 'exclude';
  radius?: number; // in miles
  coordinates: [number, number]; // [lat, lng]
  bbox?: [number, number, number, number];
  geometry?: unknown;
  key?: string; // Meta location key (e.g., "2490299" for Toronto)
  country_code?: string; // ISO country code (e.g., "US", "CA")
}

export interface LocationData {
  locations: LocationItem[];
  status?: string;
}

export interface TargetingTransformResult {
  targeting: TargetingSpec;
  warnings: string[];
  includedLocationCount: number;
  excludedLocationCount: number;
}

// ============================================================================
// TARGETING TRANSFORMER CLASS
// ============================================================================

export class TargetingTransformer {
  /**
   * Transform location data to Meta targeting spec
   */
  transform(locationData: unknown): TargetingTransformResult {
    const warnings: string[] = [];

    // Parse and validate location data
    const parsed = this.parseLocationData(locationData);

    if (!parsed || parsed.locations.length === 0) {
      throw new Error('No locations specified for targeting');
    }

    // Separate included and excluded locations
    const included = parsed.locations.filter(loc => loc.mode !== 'exclude');
    const excluded = parsed.locations.filter(loc => loc.mode === 'exclude');

    if (included.length === 0) {
      throw new Error('At least one included location is required');
    }

    // Build geo_locations
    const geoLocations = this.buildGeoLocations(included, excluded);

    // Warn if targeting might be too narrow
    if (included.length === 1 && included[0]?.type === 'city') {
      warnings.push('Targeting a single city may result in a small audience. Consider expanding targeting.');
    }

    // Build complete targeting spec
    const targeting: TargetingSpec = {
      geo_locations: geoLocations,
      age_min: TARGETING_DEFAULTS.ageMin,
      age_max: TARGETING_DEFAULTS.ageMax,
      publisher_platforms: [...TARGETING_DEFAULTS.publisherPlatforms],
      facebook_positions: [...TARGETING_DEFAULTS.facebookPositions],
      instagram_positions: [...TARGETING_DEFAULTS.instagramPositions],
      device_platforms: [...TARGETING_DEFAULTS.devicePlatforms],
      targeting_optimization: 'none' // Disable automatic expansion initially
    };

    return {
      targeting,
      warnings,
      includedLocationCount: included.length,
      excludedLocationCount: excluded.length
    };
  }

  /**
   * Build geo_locations from location items
   */
  private buildGeoLocations(
    included: LocationItem[],
    excluded: LocationItem[]
  ): GeoLocation {
    const geoLocation: GeoLocation = {
      location_types: [...TARGETING_DEFAULTS.locationTypes]
    };

    // Group by type
    const countries = included.filter(loc => loc.type === 'country');
    const regions = included.filter(loc => loc.type === 'region');
    const cities = included.filter(loc => loc.type === 'city' || loc.type === 'radius');

    // Add countries
    if (countries.length > 0) {
      geoLocation.countries = countries
        .map(loc => this.extractCountryCode(loc))
        .filter(Boolean) as string[];
    }

    // Add regions (states, provinces)
    if (regions.length > 0) {
      geoLocation.regions = regions
        .map(loc => this.extractRegionKey(loc))
        .filter(Boolean) as Array<{ key: string }>;
    }

    // Add cities
    if (cities.length > 0) {
      geoLocation.cities = cities.map(loc => {
        const city: { key: string; radius?: number; distance_unit?: 'mile' | 'kilometer' } = {
          key: loc.key || this.extractCityKey(loc)
        };

        // Add radius if specified
        if (loc.type === 'radius' && loc.radius) {
          city.radius = loc.radius;
          city.distance_unit = 'mile';
        }

        return city;
      }).filter(city => city.key) as Array<{ key: string; radius?: number; distance_unit?: 'mile' | 'kilometer' }>;
    }

    // Add exclusions if any
    if (excluded.length > 0) {
      const excludedCountries = excluded.filter(loc => loc.type === 'country');
      const excludedRegions = excluded.filter(loc => loc.type === 'region');
      const excludedCities = excluded.filter(loc => loc.type === 'city' || loc.type === 'radius');

      if (excludedCountries.length > 0 || excludedRegions.length > 0 || excludedCities.length > 0) {
        geoLocation.excluded_geo_locations = {};

        if (excludedCountries.length > 0) {
          geoLocation.excluded_geo_locations.countries = excludedCountries
            .map(loc => this.extractCountryCode(loc))
            .filter(Boolean) as string[];
        }

        if (excludedRegions.length > 0) {
          geoLocation.excluded_geo_locations.regions = excludedRegions
            .map(loc => this.extractRegionKey(loc))
            .filter(Boolean) as Array<{ key: string }>;
        }

        if (excludedCities.length > 0) {
          geoLocation.excluded_geo_locations.cities = excludedCities
            .map(loc => ({ key: loc.key || this.extractCityKey(loc) }))
            .filter(city => city.key) as Array<{ key: string }>;
        }
      }
    }

    return geoLocation;
  }

  /**
   * Parse location_data from campaign_states
   */
  private parseLocationData(data: unknown): LocationData | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const obj = data as { locations?: unknown; status?: string };

    if (!Array.isArray(obj.locations)) {
      return null;
    }

    return {
      locations: obj.locations as LocationItem[],
      status: obj.status
    };
  }

  /**
   * Extract country code from location
   */
  private extractCountryCode(location: LocationItem): string | null {
    // If country_code is already set, use it
    if (location.country_code) {
      return location.country_code.toUpperCase();
    }

    // Try to extract from name (e.g., "United States" -> "US")
    const countryMap: Record<string, string> = {
      'united states': 'US',
      'usa': 'US',
      'canada': 'CA',
      'united kingdom': 'GB',
      'uk': 'GB',
      'australia': 'AU',
      'germany': 'DE',
      'france': 'FR',
      'italy': 'IT',
      'spain': 'ES',
      'mexico': 'MX',
      'brazil': 'BR',
      'india': 'IN',
      'japan': 'JP',
      'china': 'CN'
      // Add more as needed
    };

    const normalized = location.name.toLowerCase().trim();
    return countryMap[normalized] || null;
  }

  /**
   * Extract region key from location
   */
  private extractRegionKey(location: LocationItem): { key: string } | null {
    // Meta requires region keys (e.g., "3847" for California)
    // If we have a key, use it
    if (location.key) {
      return { key: location.key };
    }

    // Otherwise, we need to look up the region key
    // This would require the Meta Location Search API
    // For now, return null and log warning
    console.warn(`Region ${location.name} missing Meta location key. Use Location Search API to get key.`);
    return null;
  }

  /**
   * Extract city key from location
   */
  private extractCityKey(location: LocationItem): string {
    // Meta requires city keys for targeting
    // If we have a key, use it
    if (location.key) {
      return location.key;
    }

    // Otherwise, we need to look up the city key via Meta Location Search API
    // For now, use the ID as a fallback (may not work)
    console.warn(`City ${location.name} missing Meta location key. Use Location Search API to get key.`);
    return location.id;
  }

  /**
   * Validate targeting spec
   */
  validate(targeting: TargetingSpec): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Must have at least one location
    const hasLocations = !!(
      targeting.geo_locations.countries?.length ||
      targeting.geo_locations.regions?.length ||
      targeting.geo_locations.cities?.length
    );

    if (!hasLocations) {
      errors.push('At least one location is required');
    }

    // Age range validation
    if (targeting.age_min && targeting.age_min < 13) {
      errors.push('Minimum age must be at least 13');
    }

    if (targeting.age_max && targeting.age_max > 65) {
      warnings.push('Maximum age above 65 may limit reach');
    }

    if (targeting.age_min && targeting.age_max && targeting.age_min > targeting.age_max) {
      errors.push('Minimum age cannot be greater than maximum age');
    }

    // Platform validation
    if (targeting.publisher_platforms && targeting.publisher_platforms.length === 0) {
      errors.push('At least one publisher platform required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Estimate audience size (basic estimate, not from Meta API)
   */
  estimateAudienceSize(targeting: TargetingSpec): {
    estimate: string;
    confidence: 'low' | 'medium' | 'high';
  } {
    let estimate = 'Unknown';
    let confidence: 'low' | 'medium' | 'high' = 'low';

    // Very basic estimation logic
    const countryCount = targeting.geo_locations.countries?.length || 0;
    const regionCount = targeting.geo_locations.regions?.length || 0;
    const cityCount = targeting.geo_locations.cities?.length || 0;

    if (countryCount > 0) {
      estimate = countryCount > 1 ? '10M - 100M+' : '1M - 50M';
      confidence = 'low';
    } else if (regionCount > 0) {
      estimate = regionCount > 1 ? '1M - 10M' : '100K - 5M';
      confidence = 'low';
    } else if (cityCount > 0) {
      estimate = cityCount > 1 ? '50K - 1M' : '10K - 500K';
      confidence = 'low';
    }

    return { estimate, confidence };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a targeting transformer instance
 */
export function createTargetingTransformer(): TargetingTransformer {
  return new TargetingTransformer();
}

/**
 * Transform location data to targeting spec
 */
export function transformLocationData(locationData: unknown): TargetingTransformResult {
  const transformer = new TargetingTransformer();
  return transformer.transform(locationData);
}

/**
 * Validate targeting specification
 */
export function validateTargeting(targeting: TargetingSpec): boolean {
  const transformer = new TargetingTransformer();
  const result = transformer.validate(targeting);
  return result.isValid;
}

/**
 * Extract location data from campaign_states
 */
export function extractLocationData(campaignStates: unknown): unknown {
  if (!campaignStates || typeof campaignStates !== 'object') {
    return null;
  }

  const states = campaignStates as { location_data?: unknown };
  return states.location_data || null;
}

