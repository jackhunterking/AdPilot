/**
 * Feature: Gather Audience Info Tool
 * Purpose: Track conversation progress for manual targeting and guide AI to ask follow-up questions
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const gatherAudienceInfoTool = tool({
  description: `Track audience information gathering progress for manual targeting.
  
  WHEN TO USE:
  - User has selected manual targeting and is describing their audience
  - You need to determine if you have enough information to generate parameters
  - You need to decide what follow-up question to ask next
  
  CONVERSATION FLOW:
  1. User provides initial description (e.g., "women interested in fitness")
  2. Use this tool to assess what's missing (age range, specific interests, behaviors)
  3. Based on the assessment, ask ONE focused follow-up question
  4. Repeat until you have enough information (demographics + interests/behaviors)
  5. When isComplete is true, proceed to generate parameters with manualTargetingParameters tool
  
  WHAT CONSTITUTES "ENOUGH INFORMATION":
  - Demographics: At least age range indication (even rough like "young adults" or "middle-aged")
  - Interests OR Behaviors: At least 2-3 specific interests or 1-2 behaviors
  - Gender: Optional, can default to "all" if not specified
  
  EXAMPLE PROGRESSION:
  User: "Women interested in fitness"
  → Ask: "What age range are you targeting? For example, college students (18-24), young professionals (25-35), or another range?"
  
  User: "25-40"
  → Ask: "What specific fitness interests? For example: yoga, running, gym workouts, healthy eating, etc."
  
  User: "Yoga and healthy eating"
  → isComplete: true (have demographics + 2 interests) → Generate parameters`,
  
  inputSchema: z.object({
    currentDescription: z.string().describe('Summary of what the user has described so far about their audience'),
    hasDemographics: z.boolean().describe('Whether we have age range and/or gender information'),
    hasInterests: z.boolean().describe('Whether we have specific interests (hobbies, topics they care about)'),
    hasBehaviors: z.boolean().describe('Whether we have behaviors (purchasing patterns, life events, etc.)'),
    isComplete: z.boolean().describe('Whether we have enough information to generate targeting parameters (demographics + at least 2-3 interests or 1-2 behaviors)'),
    nextQuestion: z.string().optional().describe('The next follow-up question to ask the user, if not complete'),
  }),
  
  // Server-side execution
  execute: async (input, { toolCallId }) => {
    return {
      success: true,
      currentDescription: input.currentDescription,
      hasDemographics: input.hasDemographics,
      hasInterests: input.hasInterests,
      hasBehaviors: input.hasBehaviors,
      isComplete: input.isComplete,
      nextQuestion: input.nextQuestion,
      toolCallId,
    };
  },
});

