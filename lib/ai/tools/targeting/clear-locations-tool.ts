/**
 * Feature: Clear Locations Tool
 * Purpose: Remove all location targeting
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const clearLocationsTool = tool({
  description: 'Clear ALL location targeting. Use when user wants to start over or remove all locations. Destructive operation - requires confirmation.',
  
  inputSchema: z.object({
    confirmationMessage: z.string().optional().describe('Optional message to show in confirmation'),
  }),
  
  // NO execute - destructive operation, needs confirmation
});

