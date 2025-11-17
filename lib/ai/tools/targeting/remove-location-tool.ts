/**
 * Feature: Remove Location Tool
 * Purpose: Remove specific location from targeting
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const removeLocationTool = tool({
  description: 'Remove a specific location from targeting. Use when user wants to delete or remove a previously added location by name.',
  
  inputSchema: z.object({
    locationName: z.string().describe('Exact name of location to remove (must match existing location)'),
  }),
  
  execute: async ({ locationName }) => {
    console.log('[removeLocationTool] Removing location:', locationName);
    
    // Returns instruction for client to handle via context
    return {
      success: true,
      action: 'remove',
      locationName,
      message: `Removed ${locationName} from targeting`,
    };
  },
});

