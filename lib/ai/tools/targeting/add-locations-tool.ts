/**
 * Feature: Add Locations Tool
 * Purpose: Add location targeting (include or exclude) for Meta ads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-definition
 */

import { tool } from 'ai';
import { z } from 'zod';
import { searchLocations, getLocationBoundary } from '@/app/actions/geocoding';
import { searchMetaLocation } from '@/app/actions/meta-location-search';

export const addLocationsTool = tool({
  description: `Add location targeting (include or exclude) for Meta ads.
  
  Supports:
  - Cities with boundaries
  - Regions (states, provinces, territories)
  - Countries  
  - Radius targeting (when user specifies distance)
  
  Location Type Rules:
  - "city": For cities/towns WITHOUT radius specified
  - "radius": ONLY when user explicitly mentions radius or distance
  - "region": For states, provinces, territories
  - "country": For countries
  
  Examples:
  - "target Toronto" → city inclusion
  - "exclude California" → region exclusion
  - "30 miles around Chicago" → radius targeting
  - "target Toronto and exclude New York" → multiple locations in one call`,
  
  inputSchema: z.object({
    locations: z.array(z.object({
      name: z.string().describe('Full location name (e.g., "Toronto, Ontario, Canada")'),
      type: z.enum(['radius', 'city', 'region', 'country']),
      radius: z.number().optional().describe('Radius in miles - ONLY for radius type (10-50)'),
      mode: z.enum(['include', 'exclude']).describe('Include or exclude this location'),
    })).min(1).max(25).describe('Array of locations to add (Meta limit: 25 total)'),
    explanation: z.string().describe('Brief explanation of targeting strategy'),
  }),
  
  // Server-side execution - processes geocoding and returns complete location data
  // Matches pattern used in editVariationTool for consistent AI SDK behavior
  execute: async (input) => {
    try {
      console.log('[addLocationsTool] Processing locations:', {
        count: input.locations.length,
        locations: input.locations.map(l => ({ name: l.name, type: l.type, mode: l.mode }))
      });

      // Process all locations in parallel (same logic as client-side handler)
      const processed = await Promise.all(
        input.locations.map(async (loc) => {
          try {
            // Step 1: Geocoding
            const geoResult = await searchLocations(loc.name);
            
            if (!geoResult.success || !geoResult.data) {
              console.warn('[addLocationsTool] Geocoding failed for:', loc.name);
              return null;
            }

            const [lng, lat] = geoResult.data.center;
            
            // Step 2: Fetch boundary geometry (for map display)
            const boundary = await getLocationBoundary(
              [lng, lat],
              geoResult.data.place_name
            );

            // Step 3: Meta location lookup (for publishing)
            const metaType = loc.type === 'radius' ? 'city' : loc.type;
            const metaResult = await searchMetaLocation(
              loc.name,
              [lng, lat],
              metaType as 'city' | 'region' | 'country'
            );

            // Build complete location object with proper place name from geocoding
            return {
              name: geoResult.data.place_name,  // Use proper geocoded name, not user input
              coordinates: [lng, lat] as [number, number],
              radius: loc.radius || 30,
              type: loc.type,
              mode: loc.mode,
              bbox: geoResult.data.bbox || boundary?.bbox,
              geometry: boundary?.geometry,
              key: metaResult?.key,
              country_code: metaResult?.country_code,
            };
          } catch (error) {
            console.error('[addLocationsTool] Error processing location:', loc.name, error);
            return null;
          }
        })
      );

      // Filter out failed geocoding results
      const validLocations = processed.filter((loc): loc is NonNullable<typeof loc> => loc !== null);

      if (validLocations.length === 0) {
        console.error('[addLocationsTool] ❌ All locations failed to geocode');
        return {
          success: false,
          error: 'Failed to geocode any locations',
          message: 'Unable to find the specified locations. This could be due to:\n' +
                   '• Geocoding service temporarily unavailable\n' +
                   '• Invalid location name (try "City, State, Country")\n' +
                   '• Network connectivity issue\n' +
                   'Please try again in a moment.'
        };
      }

      console.log('[addLocationsTool] ✅ Successfully processed locations:', {
        total: input.locations.length,
        successful: validLocations.length,
        failed: input.locations.length - validLocations.length
      });

      return {
        success: true,
        locations: validLocations,
        count: validLocations.length,
        message: `Added ${validLocations.length} location(s)`,
        _metadata: {
          timestamp: Date.now(),
          toolVersion: '2.0.0',
          processedCount: input.locations.length
        }
      };
    } catch (error) {
      console.error('[addLocationsTool] Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process locations',
        message: 'An error occurred while processing locations. Please try again.'
      };
    }
  },
});

