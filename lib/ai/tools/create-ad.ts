/**
 * Feature: Create Ad Tool
 * Purpose: Create new ad draft and navigate to Ad Builder
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const createAdTool = tool({
  description: 'Creates a new ad draft and opens Ad Builder. Call this when user says "create an ad", "create a new ad", "make a new ad" or similar. This will show a confirmation dialog to the user before creating the ad.',
  inputSchema: z.object({
    confirmationMessage: z.string().optional().describe('Optional custom message to show in confirmation dialog. If not provided, a default message will be used.'),
  }),
  // No execute function - tool execution is handled client-side
  // The client will show a confirmation dialog and handle draft creation + navigation
  // Per AI SDK docs: execute is optional for client-side handled tools
});

