/**
 * Feature: Select Variation Tool
 * Purpose: Select which creative variation to use as primary
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const selectVariationTool = tool({
  description: 'Select which creative variation to use as the primary ad creative. Use when user chooses a specific variation from the generated options (e.g., "use variation 2", "select the first one").',
  
  inputSchema: z.object({
    variationIndex: z.number().min(0).max(2).describe('Variation to select (0-2, where 0 is first, 1 is second, 2 is third)'),
  }),
  
  execute: async ({ variationIndex }) => {
    console.log('[selectVariationTool] Selecting variation:', variationIndex);
    
    // Direct operation - returns instruction for client to update selection
    return {
      success: true,
      selectedIndex: variationIndex,
      message: `Selected Variation ${variationIndex + 1} as primary creative`,
    };
  },
});

