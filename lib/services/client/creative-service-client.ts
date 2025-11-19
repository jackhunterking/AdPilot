/**
 * Feature: Creative Service Client (Stub)
 * Purpose: Client-side creative operations - TO BE FULLY IMPLEMENTED
 * Microservices: Client service layer calling API routes
 * References:
 *  - API v1: app/api/v1/images/variations
 *  - Contract: lib/services/contracts/creative-service.interface.ts
 */

"use client";

import type { 
  CreativeService,
  GenerateVariationsInput,
  GenerateVariationsResult,
  EditVariationInput,
  EditVariationResult,
  RegenerateVariationInput,
  SelectVariationInput,
  DeleteVariationInput,
  ImageVariation,
} from '../contracts/creative-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Creative Service Client (Full Implementation)
 * 
 * Client-side implementation that calls API v1 routes for image generation.
 * 
 * Architecture:
 * - Uses fetch to call /api/v1/images/* endpoints
 * - Handles network errors gracefully
 * - Returns standardized ServiceResult<T>
 * - Type-safe request/response handling
 */
class CreativeServiceClient implements CreativeService {
  generateVariations = {
    async execute(input: GenerateVariationsInput): Promise<ServiceResult<GenerateVariationsResult>> {
      try {
        const response = await fetch('/api/v1/images/variations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(input),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { variations: ImageVariation[] } };
        return {
          success: true,
          data: {
            variations: successResult.data.variations,
            baseImageUrl: input.baseImageUrl,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to generate variations',
          },
        };
      }
    }
  };

  editVariation = {
    async execute(input: EditVariationInput): Promise<ServiceResult<EditVariationResult>> {
      try {
        const response = await fetch('/api/v1/images/variations/single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(input),
        });
        
        const result: unknown = await response.json();
        
        if (!response.ok) {
          const errorResult = result as { success: false; error: { code: string; message: string } };
          return {
            success: false,
            error: errorResult.error,
          };
        }
        
        const successResult = result as { success: true; data: { imageUrl: string } };
        return {
          success: true,
          data: {
            imageUrl: successResult.data.imageUrl,
            variationIndex: input.variationIndex,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to edit variation',
          },
        };
      }
    }
  };

  regenerateVariation = {
    async execute(input: RegenerateVariationInput): Promise<ServiceResult<EditVariationResult>> {
      try {
        const response = await fetch('/api/v1/images/variations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: input.originalPrompt,
            campaignId: input.campaignId,
            adId: input.adId,
            count: 1, // Single regeneration
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
        
        const successResult = result as { success: true; data: { variations: ImageVariation[] } };
        return {
          success: true,
          data: {
            imageUrl: successResult.data.variations[0]?.url || '',
            variationIndex: input.variationIndex,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'network_error',
            message: error instanceof Error ? error.message : 'Failed to regenerate variation',
          },
        };
      }
    }
  };

  selectVariation = {
    async execute(input: SelectVariationInput): Promise<ServiceResult<void>> {
      try {
        // Update ad creative_data to mark selected variation
        const response = await fetch(`/api/v1/ads/${input.adId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            creative_data: {
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
            message: error instanceof Error ? error.message : 'Failed to select variation',
          },
        };
      }
    }
  };

  deleteVariation = {
    async execute(input: DeleteVariationInput): Promise<ServiceResult<void>> {
      try {
        // Get current ad data first to remove specific variation
        const getResponse = await fetch(`/api/v1/ads/${input.adId}`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!getResponse.ok) {
          return {
            success: false,
            error: {
              code: 'fetch_failed',
              message: 'Failed to fetch ad data',
            },
          };
        }
        
        const adResult: unknown = await getResponse.json();
        const adData = adResult as { success: true; data: { ad: { creative_data?: { variations?: unknown[] } } } };
        
        // Remove the variation at the specified index
        const currentVariations = adData.data.ad.creative_data?.variations || [];
        const updatedVariations = (currentVariations as unknown[]).filter((_, index) => index !== input.variationIndex);
        
        // Update ad with filtered variations
        const response = await fetch(`/api/v1/ads/${input.adId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            creative_data: {
              variations: updatedVariations,
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
            message: error instanceof Error ? error.message : 'Failed to delete variation',
          },
        };
      }
    }
  };
}

export const creativeServiceClient = new CreativeServiceClient();

