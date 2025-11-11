/**
 * Feature: Manual Targeting Parameters Tool
 * Purpose: Generate and set targeting parameters from natural language audience description
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';

export const manualTargetingParametersTool = tool({
  description: `Generate Meta targeting parameters from a complete audience description after gathering information.
  
  WHEN TO USE:
  - After using gatherAudienceInfo tool and isComplete is true
  - User has provided demographics (age, gender) AND interests/behaviors
  - You have enough information to create comprehensive targeting parameters
  
  DO NOT USE:
  - When you still need to ask follow-up questions
  - When demographic or interest information is incomplete
  
  PARAMETER GUIDELINES:
  - Age range: 18-65 (adjust based on user's description)
  - Gender: "all", "male", or "female"
  - Interests: Extract relevant Meta ad interests from description (aim for 2-5 interests)
  - Behaviors: Extract relevant Meta ad behaviors from description (optional, 1-3 if mentioned)
  
  EXAMPLES:
  Full context: "Women aged 25-40 interested in fitness, specifically yoga and healthy eating"
  → demographics: { ageMin: 25, ageMax: 40, gender: "female" }
  → interests: [
      { id: "fitness-wellness", name: "Fitness and wellness" },
      { id: "yoga", name: "Yoga" },
      { id: "healthy-eating", name: "Healthy eating" }
    ]
  
  Full context: "Small business owners in tech, aged 30-50, interested in SaaS and digital marketing"
  → demographics: { ageMin: 30, ageMax: 50, gender: "all" }
  → interests: [
      { id: "technology", name: "Technology" },
      { id: "saas", name: "Software as a service" },
      { id: "digital-marketing", name: "Digital marketing" }
    ]
  → behaviors: [{ id: "small-business-owner", name: "Small business owners" }]
  
  IMPORTANT: After generating parameters, these will be shown to the user with a confirmation button.`,
  
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
      needsConfirmation: true, // Always require user confirmation via button in chat
      description: input.description,
      demographics: input.demographics,
      interests: input.interests,
      behaviors: input.behaviors,
      explanation: input.explanation,
      toolCallId,
    };
  },
});

