/**
 * Feature: Manual Targeting Setup Tool
 * Purpose: AI Chat tool for setting up manual audience targeting with natural language description
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const setupManualTargetingTool = tool({
  description: `Set up manual audience targeting by translating a natural language description into Meta targeting parameters.
  
  Use this tool when:
  - User has selected "Manual Targeting" mode
  - User provides a description of their ideal customer
  - User asks to set up or configure manual targeting
  
  The tool will:
  1. Accept the user's audience description
  2. Call the translation API to convert to Meta parameters
  3. Update the audience context with generated parameters
  4. Transition to the refinement interface
  
  Example descriptions:
  - "Women aged 25-40 interested in fitness and healthy eating"
  - "Small business owners in tech industry"
  - "Parents with young children who like outdoor activities"
  - "College students interested in fashion and social media"
  
  IMPORTANT: Only use this tool when the user is actively setting up manual targeting, not for general suggestions.`,
  
  inputSchema: z.object({
    description: z.string().describe('Natural language description of the ideal customer/audience'),
  }),
  
  execute: async (input, { toolCallId }) => {
    return {
      success: true,
      description: input.description,
      toolCallId,
      message: `I'll translate your description into Meta targeting parameters. Setting up manual targeting for: "${input.description}"`,
    };
  },
});

