/**
 * Feature: Edit Image Tool  
 * Purpose: Direct server-side image editing without confirmation
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - Gemini 2.5 Flash Image Preview: Model used for image editing
 */

import { tool } from 'ai';
import { z } from 'zod';
import { editImage } from '@/server/images';

export const editVariationTool = tool({
  description: 'Edit/modify an existing creative variation. Use for changes like color adjustments, brightness, removing/adding elements. For completely new version, use regenerateVariation instead.',
  inputSchema: z.object({
    imageUrl: z.string().describe('The URL of the variation to edit'),
    variationIndex: z.number().min(0).max(5).describe('Which variation (0-5) - REQUIRED for canvas update'),
    prompt: z.string().describe('Edit instruction - what to change'),
    campaignId: z.string().describe('Campaign ID'),
  }),
  // Server-side execution - DIRECT, no confirmation
  // Per AI SDK docs: Tools with execute functions run automatically
  execute: async ({ imageUrl, variationIndex, prompt, campaignId }) => {
    const startTime = Date.now();
    
    try {
      // Comprehensive logging for debugging (AI SDK best practice)
      console.log(`[editImageTool] ==================== EDIT REQUEST ====================`);
      console.log(`[editImageTool] variationIndex: ${variationIndex} (type: ${typeof variationIndex})`);
      console.log(`[editImageTool] imageUrl: ${imageUrl}`);
      console.log(`[editImageTool] prompt: ${prompt}`);
      console.log(`[editImageTool] campaignId: ${campaignId}`);
      console.log(`[editImageTool] ========================================================`);
      
      // Validate required parameters (AI SDK pattern)
      if (variationIndex === undefined || variationIndex === null) {
        console.error(`[editImageTool] ❌ CRITICAL: variationIndex is missing!`);
        throw new Error('variationIndex is required for canvas update');
      }
      
      if (!imageUrl) {
        console.error(`[editImageTool] ❌ CRITICAL: imageUrl is missing!`);
        throw new Error('imageUrl is required');
      }
      
      // Edit the single image using Gemini 2.5 Flash Image Preview
      const editedUrl = await editImage(imageUrl, prompt, campaignId);
      
      const executionTime = Date.now() - startTime;
      console.log(`[editImageTool] ✅ Edit complete: ${editedUrl}`);
      console.log(`[editImageTool] ⏱️  Execution time: ${executionTime}ms`);
      
      return {
        success: true,
        editedImageUrl: editedUrl,
        variationIndex: variationIndex, // For canvas update
        originalImageUrl: imageUrl,
        editPrompt: prompt,
        message: `Image edited successfully! ${prompt}`,
        _metadata: {  // AI SDK convention for internal metadata
          timestamp: Date.now(),
          executionTime,
          toolVersion: '1.0.0',
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[editImageTool] ❌ Error:', error);
      console.error('[editImageTool] ⏱️  Failed after:', executionTime, 'ms');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to edit image',
        message: 'Sorry, I encountered an error while editing the image. Please try again.',
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

