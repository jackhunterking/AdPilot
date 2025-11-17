/**
 * Feature: Add Locations Tool
 * Purpose: Add location targeting (include or exclude) for Meta ads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-definition
 */

import { tool } from 'ai';
import { z } from 'zod';

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
  
  // NO execute - requires geocoding (3 API calls per location), needs client confirmation
});

