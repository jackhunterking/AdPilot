/**
 * Feature: Manual Targeting Parameters Tool
 * Purpose: Generate and set targeting parameters from natural language audience description
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const manualTargetingParametersTool = tool({
  description: `Generate Meta targeting parameters from a natural language audience description.
  
  WHEN TO USE:
  - User has selected manual targeting mode
  - User describes their ideal customer/audience
  - User provides demographic and interest information
  
  PARAMETER GUIDELINES:
  - Age range: 18-65 (adjust based on user's description)
  - Gender: "all", "male", or "female"
  - Interests: Extract relevant Meta ad interests from description
  - Behaviors: Extract relevant Meta ad behaviors from description
  
  EXAMPLES:
  "Women aged 25-40 interested in fitness" → 
    demographics: { ageMin: 25, ageMax: 40, gender: "female" }
    interests: [{ id: "fitness", name: "Fitness and wellness" }]
  
  "Small business owners in tech" →
    demographics: { ageMin: 25, ageMax: 55, gender: "all" }
    interests: [{ id: "tech", name: "Technology" }]
    behaviors: [{ id: "small-business", name: "Small business owners" }]`,
  
  inputSchema: z.object({
    description: z.string().describe('User\'s natural language description of their target audience'),
    demographics: z.object({
      ageMin: z.number().min(18).max(65).describe('Minimum age (18-65)'),
      ageMax: z.number().min(18).max(65).describe('Maximum age (18-65)'),
      gender: z.enum(['all', 'male', 'female']).describe('Target gender'),
    }).describe('Demographic targeting parameters'),
    interests: z.array(z.object({
      id: z.string().describe('Unique identifier for the interest'),
      name: z.string().describe('Human-readable interest name'),
    })).describe('Array of interests to target'),
    behaviors: z.array(z.object({
      id: z.string().describe('Unique identifier for the behavior'),
      name: z.string().describe('Human-readable behavior name'),
    })).describe('Array of behaviors to target'),
    explanation: z.string().describe('Brief explanation of the generated targeting strategy'),
  }),
  
  // Server-side execution for manual targeting parameters
  execute: async (input, { toolCallId }) => {
    return {
      success: true,
      description: input.description,
      demographics: input.demographics,
      interests: input.interests,
      behaviors: input.behaviors,
      explanation: input.explanation,
      toolCallId,
    };
  },
});

