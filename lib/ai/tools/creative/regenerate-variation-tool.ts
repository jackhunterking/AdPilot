/**
 * Feature: Regenerate Image Tool  
 * Purpose: Regenerate ONE specific variation with fresh take
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Gemini 2.5 Flash Image Preview: Model used for image generation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateImage } from '@/server/images';

export const regenerateVariationTool = tool({
  description: 'Regenerate ONE specific creative variation with fresh take. Use when user wants completely new version of a single variation (not all 3). User must be in edit mode with specific variation selected.',
  inputSchema: z.object({
    variationIndex: z.number().min(0).max(2).describe('Which variation (0-2) to regenerate - REQUIRED'),
    originalPrompt: z.string().describe('Original generation prompt or context to base new version on'),
    campaignId: z.string().describe('Campaign ID'),
  }),
  // Server-side execution - DIRECT, no confirmation
  // Generates ONLY 1 image for the specific variation
  execute: async ({ variationIndex, originalPrompt, campaignId }) => {
    const startTime = Date.now();
    
    try {
      // Comprehensive logging for debugging (AI SDK best practice)
      console.log(`[regenerateImageTool] ==================== REGENERATE REQUEST ====================`);
      console.log(`[regenerateImageTool] variationIndex: ${variationIndex} (type: ${typeof variationIndex})`);
      console.log(`[regenerateImageTool] originalPrompt: ${originalPrompt}`);
      console.log(`[regenerateImageTool] campaignId: ${campaignId}`);
      console.log(`[regenerateImageTool] ==============================================================`);
      
      // Validate required parameters (AI SDK pattern)
      if (variationIndex === undefined || variationIndex === null) {
        console.error(`[regenerateImageTool] ❌ CRITICAL: variationIndex is missing!`);
        throw new Error('variationIndex is required for canvas update');
      }
      
      if (!originalPrompt) {
        console.error(`[regenerateImageTool] ❌ CRITICAL: originalPrompt is missing!`);
        throw new Error('originalPrompt is required');
      }
      
      // Generate ONLY 1 image for this specific variation
      const imageUrls = await generateImage(originalPrompt, campaignId, 1);
      
      const executionTime = Date.now() - startTime;
      console.log(`[regenerateImageTool] ✅ Regenerated variation ${variationIndex}: ${imageUrls[0]}`);
      console.log(`[regenerateImageTool] ⏱️  Execution time: ${executionTime}ms`);
      
      return {
        success: true,
        imageUrl: imageUrls[0],
        variationIndex: variationIndex, // For canvas update
        message: `Regenerated Variation ${variationIndex + 1} with a fresh take.`,
        _metadata: {  // AI SDK convention for internal metadata
          timestamp: Date.now(),
          executionTime,
          toolVersion: '1.0.0',
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[regenerateImageTool] ❌ Error:', error);
      console.error('[regenerateImageTool] ⏱️  Failed after:', executionTime, 'ms');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate image',
        message: 'Sorry, I encountered an error while regenerating the image. Please try again.',
        _errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        _metadata: {
          timestamp: Date.now(),
          executionTime,
          toolVersion: '1.0.0',
        },
      };
    }
  },
});

