/**
 * Feature: Delete Ad Tool
 * Purpose: Permanently delete an ad
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const deleteAdTool = tool({
  description: 'Permanently delete an ad. Use with caution - this cannot be undone. Requires user confirmation.',
  
  inputSchema: z.object({
    adId: z.string().uuid().describe('ID of ad to delete'),
    confirmationMessage: z.string().optional(),
  }),
  
  // NO execute - destructive operation, needs strong confirmation
});

