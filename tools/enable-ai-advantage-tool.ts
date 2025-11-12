/**
 * Feature: Enable AI Advantage+ Tool
 * Purpose: AI Chat tool for enabling AI Advantage+ targeting with immediate visual feedback
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const enableAIAdvantageTool = tool({
  description: `Enable AI Advantage+ targeting for the campaign audience.
  
  Use this tool when:
  - User clicks "Enable AI Advantage+ targeting" button
  - User explicitly requests to enable AI Advantage+ targeting
  - User wants to use automatic audience optimization
  
  The tool will:
  1. Confirm AI Advantage+ targeting is enabled
  2. Display success feedback in the chat
  3. Update the audience context automatically (handled by the canvas)
  
  IMPORTANT: Call this tool immediately when the user enables AI Advantage+ targeting to provide visual feedback.`,
  
  inputSchema: z.object({
    confirmation: z.string().optional().describe('Optional confirmation message'),
  }),
  
  execute: async (input, { toolCallId }) => {
    return {
      success: true,
      toolCallId,
      message: `AI Advantage+ targeting enabled! Your ad will be shown to people most likely to engage.`,
    };
  },
});

