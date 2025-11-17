/**
 * Feature: Refine Headline Tool
 * Purpose: Quick headline-only adjustments
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { getModel } from '@/lib/ai/gateway-provider';

export const refineHeadlineTool = tool({
  description: 'Make minor adjustments to headline only. Use for quick tweaks like making it shorter, punchier, or changing tone. For major rewrites, use editCopyTool instead.',
  
  inputSchema: z.object({
    currentHeadline: z.string().describe('Current headline text'),
    instruction: z.string().describe('What to change about the headline'),
    variationIndex: z.number().min(0).max(2).describe('Which variation (0-2)'),
  }),
  
  execute: async ({ currentHeadline, instruction, variationIndex }) => {
    try {
      const { object } = await generateObject({
        model: getModel('openai/gpt-4o'),
        system: 'You are an expert at writing concise Meta ad headlines. Return ONLY the headline text, max 40 characters.',
        schema: z.object({
          headline: z.string().max(40)
        }),
        prompt: `Current headline: "${currentHeadline}"\n\nInstruction: ${instruction}\n\nProvide improved headline:`,
      });
      
      console.log('[refineHeadlineTool] Refined headline for variation', variationIndex);
      
      return {
        success: true,
        headline: object.headline,
        variationIndex,
        message: `Updated headline to: "${object.headline}"`,
      };
    } catch (error) {
      console.error('[refineHeadlineTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refine headline',
      };
    }
  },
});

