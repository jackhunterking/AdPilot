/**
 * Feature: Audience Mode Selection Tool
 * Purpose: Handle when users select AI Advantage+ or Manual Targeting mode
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const audienceModeTool = tool({
  description: `Set the audience targeting mode when user selects AI Advantage+ or Manual Targeting.
  
  WHEN TO USE:
  - User clicks "Enable AI Advantage+" button
  - User clicks "Set Up Manual Targeting" button
  - User explicitly chooses between AI or manual targeting
  
  This tool provides visual confirmation in the chat similar to location targeting.`,
  
  inputSchema: z.object({
    mode: z.enum(['ai', 'manual']).describe('The targeting mode: "ai" for AI Advantage+, "manual" for manual targeting'),
    explanation: z.string().describe('Brief, friendly confirmation message explaining what happens next'),
  }),
  
  // Server-side execution for audience mode selection
  execute: async (input, { toolCallId }) => {
    return {
      success: true,
      mode: input.mode,
      explanation: input.explanation,
      toolCallId,
    };
  },
});

