/**
 * Feature: Rename Ad Tool
 * Purpose: Change ad name
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const renameAdTool = tool({
  description: 'Rename an ad. Use when user wants to change the ad name or title.',
  
  inputSchema: z.object({
    newName: z.string().min(1).max(255).describe('New name for the ad'),
  }),
  
  execute: async ({ newName }) => {
    console.log('[renameAdTool] Renaming ad to:', newName);
    
    // Returns instruction for client to update ad name via API
    return {
      success: true,
      newName,
      message: `Renamed ad to "${newName}"`,
    };
  },
});

