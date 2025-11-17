/**
 * Feature: Refine Primary Text Tool
 * Purpose: Quick primary text adjustments
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { getModel } from '@/lib/ai/gateway-provider';

export const refinePrimaryTextTool = tool({
  description: 'Make minor adjustments to primary text only. Use for quick tweaks like tone changes, length adjustments, or emphasis. For major rewrites, use editCopyTool.',
  
  inputSchema: z.object({
    currentPrimaryText: z.string().describe('Current primary text'),
    instruction: z.string().describe('What to change'),
    variationIndex: z.number().min(0).max(2).describe('Which variation (0-2)'),
  }),
  
  execute: async ({ currentPrimaryText, instruction, variationIndex }) => {
    try {
      const { object } = await generateObject({
        model: getModel('openai/gpt-4o'),
        system: 'You are an expert at writing Meta ad primary text. Return ONLY the primary text, max 125 characters.',
        schema: z.object({
          primaryText: z.string().max(125)
        }),
        prompt: `Current: "${currentPrimaryText}"\n\nInstruction: ${instruction}\n\nProvide improved primary text:`,
      });
      
      console.log('[refinePrimaryTextTool] Refined primary text for variation', variationIndex);
      
      return {
        success: true,
        primaryText: object.primaryText,
        variationIndex,
        message: `Updated primary text`,
      };
    } catch (error) {
      console.error('[refinePrimaryTextTool] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refine primary text',
      };
    }
  },
});

