/**
 * Feature: Copy Service Contract
 * Purpose: Interface for ad copy generation and editing
 * References:
 *  - Service Contracts: lib/journeys/types/journey-contracts.ts
 *  - AI SDK v5: AI text generation
 */

import type { ServiceContract, ServiceResult } from '@/lib/journeys/types/journey-contracts';

// ============================================================================
// Copy Types
// ============================================================================

export interface CopyVariation {
  headline: string; // Max 40 chars (Meta limit)
  primaryText: string; // Max 125 chars (Meta limit)
  description?: string; // Max 30 chars (Meta limit)
  cta: string; // Call-to-action button text
}

export interface GenerateCopyInput {
  prompt: string;
  goal: 'leads' | 'calls' | 'website-visits';
  campaignId: string;
  adId?: string;
  count?: number; // Default 3
  context?: {
    businessType?: string;
    offer?: string;
    audience?: string;
  };
}

export interface GenerateCopyResult {
  variations: CopyVariation[];
}

export interface EditCopyInput {
  variationIndex: number;
  current: CopyVariation;
  prompt: string; // User instruction for changes
  adId?: string;
}

export interface EditCopyResult {
  updated: CopyVariation;
  variationIndex: number;
}

export interface RefineCopyInput {
  field: 'headline' | 'primaryText' | 'description';
  current: string;
  prompt: string;
  adId?: string;
}

export interface RefineCopyResult {
  updated: string;
  field: string;
}

export interface SelectCopyInput {
  adId: string;
  variationIndex: number;
}

// ============================================================================
// Copy Service Interface
// ============================================================================

export interface CopyService {
  /**
   * Generate copy variations
   * Creates multiple copy options aligned with campaign goal
   */
  generateCopyVariations: ServiceContract<GenerateCopyInput, ServiceResult<GenerateCopyResult>>;

  /**
   * Edit complete copy variation
   * Rewrites all fields based on user instruction
   */
  editCopy: ServiceContract<EditCopyInput, ServiceResult<EditCopyResult>>;

  /**
   * Refine headline only
   * Faster/cheaper than full copy edit
   */
  refineHeadline: ServiceContract<RefineCopyInput, ServiceResult<RefineCopyResult>>;

  /**
   * Refine primary text only
   */
  refinePrimaryText: ServiceContract<RefineCopyInput, ServiceResult<RefineCopyResult>>;

  /**
   * Refine description only
   */
  refineDescription: ServiceContract<RefineCopyInput, ServiceResult<RefineCopyResult>>;

  /**
   * Select which copy variation to use
   */
  selectCopyVariation: ServiceContract<SelectCopyInput, ServiceResult<void>>;

  /**
   * Validate copy against Meta limits
   */
  validateCopy: ServiceContract<CopyVariation, ServiceResult<{ valid: boolean; errors?: string[] }>>;
}

