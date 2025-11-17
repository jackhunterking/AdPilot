/**
 * Feature: Delete Variation Tool
 * Purpose: Remove unwanted creative variation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const deleteVariationTool = tool({
  description: 'Delete/remove an unwanted creative variation. Use when user wants to remove a specific variation they don\'t like. Cannot delete if only one variation remains.',
  
  inputSchema: z.object({
    variationIndex: z.number().min(0).max(2).describe('Variation to delete (0-2)'),
  }),
  
  execute: async ({ variationIndex }) => {
    console.log('[deleteVariationTool] Deleting variation:', variationIndex);
    
    // Direct operation - returns instruction for client to remove from array
    return {
      success: true,
      deletedIndex: variationIndex,
      message: `Removed Variation ${variationIndex + 1}`,
    };
  },
});

