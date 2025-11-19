/**
 * Feature: Creative Service Contract
 * Purpose: Interface for image generation and creative management
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 *  - OpenAI DALL-E: Image generation API
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Creative Types
// ============================================================================

export interface ImageVariation {
  url: string;
  index: number;
  format: 'square' | 'vertical';
  dimensions: { width: number; height: number };
}

export interface GenerateVariationsInput {
  prompt: string;
  campaignId: string;
  adId?: string;
  count?: number; // Default 3
  baseImageUrl?: string; // For variations of existing image
}

export interface GenerateVariationsResult {
  variations: ImageVariation[];
  baseImageUrl?: string;
}

export interface EditVariationInput {
  imageUrl: string;
  prompt: string;
  variationIndex: number;
  campaignId: string;
  adId?: string;
}

export interface EditVariationResult {
  imageUrl: string;
  variationIndex: number;
}

export interface RegenerateVariationInput {
  variationIndex: number;
  originalPrompt: string;
  campaignId: string;
  adId?: string;
}

export interface SelectVariationInput {
  adId: string;
  variationIndex: number;
}

export interface DeleteVariationInput {
  adId: string;
  variationIndex: number;
}

// ============================================================================
// Creative Service Interface
// ============================================================================

export interface CreativeService {
  /**
   * Generate image variations from prompt
   * Creates 3 variations by default
   */
  generateVariations: ServiceContract<
    GenerateVariationsInput,
    ServiceResult<GenerateVariationsResult>
  >;

  /**
   * Edit existing image variation
   * Uses DALL-E edit API to modify specific elements
   */
  editVariation: ServiceContract<EditVariationInput, ServiceResult<EditVariationResult>>;

  /**
   * Regenerate a single variation
   * Creates new version while maintaining creative direction
   */
  regenerateVariation: ServiceContract<
    RegenerateVariationInput,
    ServiceResult<EditVariationResult>
  >;

  /**
   * Select which variation to use
   * Updates ad snapshot with selected index
   */
  selectVariation: ServiceContract<SelectVariationInput, ServiceResult<void>>;

  /**
   * Delete a variation
   * Removes from ad creative data
   */
  deleteVariation: ServiceContract<DeleteVariationInput, ServiceResult<void>>;
}

