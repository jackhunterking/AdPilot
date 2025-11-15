/**
 * Feature: Location Targeting Tool
 * Purpose: Set location targeting for Meta ads
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#tool-definition
 */

import { tool } from 'ai';
import { z } from 'zod';

export const locationTargetingTool = tool({
  description: `Set location targeting for Meta ads. Supports city boundaries, regions, countries, and radius targeting.
  
  Location Type Rules:
  - "city": For cities/towns WITHOUT radius specified (shows actual city boundaries)
  - "radius": ONLY when user explicitly mentions radius or distance (e.g., "30 miles around Toronto")
  - "region": For states, provinces, territories (e.g., California, Ontario)
  - "country": For countries (e.g., Canada, United States)
  
  Examples:
  - "Target Vancouver" → type: "city" (shows city boundaries)
  - "Target Vancouver with 30 mile radius" → type: "radius", radius: 30
  - "Target California" → type: "region"
  - "Target Canada" → type: "country"`,
  
  inputSchema: z.object({
    locations: z.array(z.object({
      name: z.string().describe('Full location name (e.g., "Toronto, Ontario, Canada", "New York, NY, United States")'),
      type: z.enum(['radius', 'city', 'region', 'country']).describe('Type: "city" for city boundaries, "radius" ONLY when explicitly mentioned, "region" for states/provinces, "country" for countries'),
      radius: z.number().optional().describe('Radius in miles - ONLY required when type is "radius" (between 10-50 miles)'),
      mode: z.enum(['include', 'exclude']).describe('Whether to include or exclude this location'),
    })).describe('Array of locations to target'),
    explanation: z.string().describe('Brief explanation of the targeting strategy in conversational tone'),
  }),
  // Server-side execution for location targeting
  // Note: Still requires client-side geocoding and map updates via event system
  execute: async (input, { toolCallId }) => {
    // Return input for client to handle geocoding
    // Client will:
    // 1. Geocode locations
    // 2. Fetch boundaries
    // 3. Update map
    // 4. Call addToolResult with final data
    return {
      status: 'requires_geocoding',
      toolCallId,
      locations: input.locations,
      explanation: input.explanation,
      message: 'Locations ready for geocoding and mapping',
    };
  },
});

