/**
 * Feature: Generate Copy Variations Tool
 * Purpose: Generate 3 ad copy variations with different angles/tones
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - AI SDK Structured Output: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 */

import { tool } from 'ai';
import { z } from 'zod';

export const generateCopyVariationsTool = tool({
  description: 'Generate 3 ad copy variations with different angles and tones. Use when user wants multiple copy options or is on copy step. Each variation has primaryText, headline, and description.',
  
  inputSchema: z.object({
    context: z.string().describe('Business context, offer, and target audience for the ad'),
    creativeStyle: z.string().optional().describe('Style of the paired creative to match tone'),
    preferEmojis: z.boolean().default(false).describe('Whether to include emojis in copy'),
  }),
  
  // NO execute - will use generateObject with streaming, needs client confirmation
  // Client will show 3 options and user selects which to use
});

