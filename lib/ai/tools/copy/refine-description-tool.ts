/**
 * Feature: Refine Description Tool
 * Purpose: Quick description adjustments
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { getModel } from '@/lib/ai/gateway-provider';

export const refineDescriptionTool = tool({
  description: 'Make minor adjustments to description only. Use for quick tweaks to the description text. For major rewrites, use editCopyTool.',
  
  inputSchema: z.object({
    currentDescription: z.string().describe('Current description text'),
    instruction: z.string().describe('What to change'),
    variationIndex: z.number().min(0).max(2).describe('Which variation (0-2)'),
  }),
  
  execute: async ({ currentDescription, instruction, variationIndex }) => {
    try {
      const { object } = await generateObject({
        model: getModel('openai/gpt-4o'),
        system: 'You are an expert at writing Meta ad descriptions. Return ONLY the description, max 30 characters.',
        schema: z.object({
          description: z.string().max(30)
        }),
        prompt: `Current: "${currentDescription}"\n\nInstruction: ${instruction}\n\nProvide improved description:`,
      });
      
      console.log('[refineDescriptionTool] Refined description for variation', variationIndex);
      
      return {
        success: true,
        description: object.description,
        variationIndex,
        message: `Updated description to: "${object.description}"`,
      };
    } catch (error) {
      console.error('[refineDescriptionTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refine description',
      };
    }
  },
});

