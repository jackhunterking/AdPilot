/**
 * Feature: Select Copy Variation Tool
 * Purpose: Select which copy variation to use as primary
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const selectCopyVariationTool = tool({
  description: 'Select which ad copy variation to use as primary. Use when user chooses specific copy from options.',
  
  inputSchema: z.object({
    variationIndex: z.number().min(0).max(2).describe('Copy variation to select (0-2)'),
  }),
  
  execute: async ({ variationIndex }) => {
    console.log('[selectCopyVariationTool] Selecting copy variation:', variationIndex);
    
    return {
      success: true,
      selectedIndex: variationIndex,
      message: `Selected Copy Variation ${variationIndex + 1}`,
    };
  },
});

