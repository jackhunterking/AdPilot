/**
 * Feature: Duplicate Ad Tool
 * Purpose: Copy ad with all settings
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const duplicateAdTool = tool({
  description: 'Duplicate/copy an ad with all its settings (creative, copy, targeting, etc.). Use when user wants to create a variation or test different approaches.',
  
  inputSchema: z.object({
    newName: z.string().optional().describe('Optional name for the duplicate ad'),
    confirmationMessage: z.string().optional(),
  }),
  
  // NO execute - creates new resources, needs confirmation
});

