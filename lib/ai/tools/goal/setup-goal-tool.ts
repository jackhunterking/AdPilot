/**
 * Feature: Setup Goal Tool
 * Purpose: Configure campaign goals with server-side execution
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const setupGoalTool = tool({
  description: 'Call this tool IMMEDIATELY when user wants to set up a leads or calls goal. This shows an interactive UI where users can choose to create a new form or use an existing one. Do not ask text questions - the tool handles all interaction.',
  inputSchema: z.object({
    goalType: z.enum(['leads', 'calls']).describe('The type of goal to set up'),
    conversionMethod: z.enum(['instant-forms', 'website', 'calls']).describe('How to collect conversions - use "instant-forms" for leads'),
    formId: z.string().optional().describe('Leave empty - user will select in the UI'),
    formName: z.string().optional().describe('Leave empty - user will select in the UI'),
    createNew: z.boolean().optional().describe('Leave empty - user will select in the UI'),
    explanation: z.string().describe('Brief explanation like "Setting up your leads goal with instant forms"'),
  }),
  // Server-side execution for goal setup
  // Returns data for client form selection UI
  execute: async (input, { toolCallId }) => {
    return {
      status: 'requires_form_selection',
      goalType: input.goalType,
      conversionMethod: input.conversionMethod,
      explanation: input.explanation,
      toolCallId,
      message: 'Goal setup ready - awaiting form selection from user',
    };
  },
});

