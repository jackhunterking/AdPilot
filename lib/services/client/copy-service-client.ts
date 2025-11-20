/**
 * Feature: Copy Service Client (Stub)
 * Purpose: Client-side copy operations - TO BE FULLY IMPLEMENTED
 * Microservices: Client service layer calling API routes
 * References:
 *  - Contract: lib/services/contracts/copy-service.interface.ts
 */

"use client";

import type { 
  CopyService,
  GenerateCopyInput,
  GenerateCopyResult,
  EditCopyInput,
  EditCopyResult,
  RefineCopyInput,
  RefineCopyResult,
  SelectCopyInput,
  CopyVariation,
} from '../contracts/copy-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Copy Service Client (Full Implementation)
 * 
 * Client-side implementation that calls API v1 routes for copy generation.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/creative/plan endpoint
 * - Enforces Meta character limits (headline ≤40, primaryText ≤125, description ≤30)
 * - Returns standardized ServiceResult<T>
 * - Type-safe request/response handling
 */
class CopyServiceClient implements CopyService {
  generateCopyVariations = {
    async execute(input: GenerateCopyInput): Promise<ServiceResult<GenerateCopyResult>> {
      try {
        const response = await fetch('/api/v1/creative/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            campaignId: input.campaignId,
            goal: input.goal,
            prompt: input.prompt,
            context: input.context,
            count: input.count || 3,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        // Extract variations from response and enforce character limits
        const successResult = result as { success: true; data: { copyVariations?: CopyVariation[] } };
        const variations = (successResult.data.copyVariations || []).map((variation: CopyVariation) => ({
          headline: variation.headline.slice(0, 40),
          primaryText: variation.primaryText.slice(0, 125),
          description: variation.description ? variation.description.slice(0, 30) : undefined,
          cta: variation.cta,
        }));
        
        return {
          success: true,
          data: { variations },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to generate copy variations',
          },
        };
      }
    }
  };

  editCopy = {
    async execute(input: EditCopyInput): Promise<ServiceResult<EditCopyResult>> {
      try {
        const response = await fetch('/api/v1/creative/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: `Edit this ad copy: ${input.prompt}\n\nCurrent:\nHeadline: ${input.current.headline}\nPrimary Text: ${input.current.primaryText}\nDescription: ${input.current.description || 'none'}\nCTA: ${input.current.cta}`,
            count: 1,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { copyVariations?: CopyVariation[] } };
        const updatedVariation = successResult.data.copyVariations?.[0] || input.current;
        
        return {
          success: true,
          data: {
            updated: {
              headline: updatedVariation.headline.slice(0, 40),
              primaryText: updatedVariation.primaryText.slice(0, 125),
              description: updatedVariation.description ? updatedVariation.description.slice(0, 30) : undefined,
              cta: updatedVariation.cta,
            },
            variationIndex: input.variationIndex,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to edit copy',
          },
        };
      }
    }
  };

  refineHeadline = {
    async execute(input: RefineCopyInput): Promise<ServiceResult<RefineCopyResult>> {
      try {
        const response = await fetch('/api/v1/creative/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: `Refine this headline: "${input.current}"\n\nInstruction: ${input.prompt}\n\nKeep it under 40 characters.`,
            count: 1,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { copyVariations?: CopyVariation[] } };
        const refinedHeadline = successResult.data.copyVariations?.[0]?.headline || input.current;
        
        return {
          success: true,
          data: {
            updated: refinedHeadline.slice(0, 40),
            field: 'headline',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to refine headline',
          },
        };
      }
    }
  };

  refinePrimaryText = {
    async execute(input: RefineCopyInput): Promise<ServiceResult<RefineCopyResult>> {
      try {
        const response = await fetch('/api/v1/creative/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: `Refine this primary text: "${input.current}"\n\nInstruction: ${input.prompt}\n\nKeep it under 125 characters.`,
            count: 1,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { copyVariations?: CopyVariation[] } };
        const refinedText = successResult.data.copyVariations?.[0]?.primaryText || input.current;
        
        return {
          success: true,
          data: {
            updated: refinedText.slice(0, 125),
            field: 'primaryText',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to refine primary text',
          },
        };
      }
    }
  };

  refineDescription = {
    async execute(input: RefineCopyInput): Promise<ServiceResult<RefineCopyResult>> {
      try {
        const response = await fetch('/api/v1/creative/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: `Refine this description: "${input.current}"\n\nInstruction: ${input.prompt}\n\nKeep it under 30 characters.`,
            count: 1,
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { copyVariations?: CopyVariation[] } };
        const refinedDescription = successResult.data.copyVariations?.[0]?.description || input.current;
        
        return {
          success: true,
          data: {
            updated: refinedDescription.slice(0, 30),
            field: 'description',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to refine description',
          },
        };
      }
    }
  };

  selectCopyVariation = {
    async execute(input: SelectCopyInput): Promise<ServiceResult<void>> {
      try {
        // Update ad copy_data to mark selected variation
        const response = await fetch(`/api/v1/ads/${input.adId}/save`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            copy: {
              selectedVariationIndex: input.variationIndex,
            },
          }),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to select copy variation',
          },
        };
      }
    }
  };

  validateCopy = {
    async execute(input: { headline: string; primaryText: string; description?: string; cta: string }): Promise<ServiceResult<{ valid: boolean; errors?: string[] }>> {
      const errors: string[] = [];
      
      // Meta character limits
      if (input.headline.length > 40) {
        errors.push(`Headline too long (${input.headline.length}/40 characters)`);
      }
      
      if (input.primaryText.length > 125) {
        errors.push(`Primary text too long (${input.primaryText.length}/125 characters)`);
      }
      
      if (input.description && input.description.length > 30) {
        errors.push(`Description too long (${input.description.length}/30 characters)`);
      }
      
      // Check required fields
      if (!input.headline.trim()) {
        errors.push('Headline is required');
      }
      
      if (!input.primaryText.trim()) {
        errors.push('Primary text is required');
      }
      
      if (!input.cta.trim()) {
        errors.push('Call-to-action is required');
      }
      
      return {
        success: true,
        data: {
          valid: errors.length === 0,
          errors: errors.length > 0 ? errors : undefined,
        },
      };
    }
  };
}

export const copyServiceClient = new CopyServiceClient();

