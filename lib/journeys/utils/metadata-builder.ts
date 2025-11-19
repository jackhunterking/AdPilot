/**
 * Feature: Journey Metadata Builder
 * Purpose: Generic utility for building AI context metadata from journey state
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

import type { JourneyMetadata } from '../types/journey-contracts';

/**
 * Metadata Builder Options
 */
export interface MetadataBuilderOptions {
  /**
   * Journey ID
   */
  journeyId: string;

  /**
   * Current mode (for multi-mode journeys)
   */
  mode?: string;

  /**
   * User input to process
   */
  input?: string;

  /**
   * Additional context data
   */
  context?: Record<string, unknown>;

  /**
   * Whether to include debug information
   */
  debug?: boolean;
}

/**
 * Build journey metadata for AI context injection
 * 
 * This utility creates standardized metadata objects that can be
 * injected into AI requests to provide journey-specific context.
 * 
 * @example
 * ```typescript
 * const metadata = buildJourneyMetadata({
 *   journeyId: 'location',
 *   mode: 'include',
 *   input: 'Toronto, Vancouver',
 *   context: { campaignId: 'xxx' }
 * });
 * ```
 */
export function buildJourneyMetadata(options: MetadataBuilderOptions): JourneyMetadata {
  const { journeyId, mode, input, context, debug = false } = options;

  const metadata: JourneyMetadata = {
    journeyId,
    ...(mode && { mode }),
    ...(input && { input }),
    ...(context && { context }),
    ...(debug && { 
      _debug: {
        timestamp: Date.now(),
        builderVersion: '1.0.0',
      }
    }),
  };

  return metadata;
}

/**
 * Merge multiple metadata objects
 * Later metadata objects override earlier ones
 */
export function mergeMetadata(...metadatas: Partial<JourneyMetadata>[]): JourneyMetadata {
  const merged: JourneyMetadata = {
    journeyId: '',
  };

  for (const metadata of metadatas) {
    Object.assign(merged, metadata);
  }

  // Merge context objects deeply
  const contexts = metadatas
    .map(m => m.context)
    .filter((c): c is Record<string, unknown> => c !== undefined);

  if (contexts.length > 0) {
    merged.context = Object.assign({}, ...contexts);
  }

  return merged;
}

/**
 * Extract metadata from AI SDK message
 */
export function extractMetadataFromMessage(message: {
  metadata?: unknown;
  [key: string]: unknown;
}): Partial<JourneyMetadata> | null {
  if (!message.metadata || typeof message.metadata !== 'object') {
    return null;
  }

  const metadata = message.metadata as Record<string, unknown>;

  return {
    journeyId: typeof metadata.journeyId === 'string' ? metadata.journeyId : undefined,
    mode: typeof metadata.mode === 'string' ? metadata.mode : undefined,
    input: typeof metadata.input === 'string' ? metadata.input : undefined,
    context: typeof metadata.context === 'object' && metadata.context !== null
      ? metadata.context as Record<string, unknown>
      : undefined,
  };
}

/**
 * Validate metadata structure
 */
export function validateMetadata(metadata: unknown): metadata is JourneyMetadata {
  if (typeof metadata !== 'object' || metadata === null) {
    return false;
  }

  const m = metadata as Record<string, unknown>;

  // journeyId is required
  if (!('journeyId' in m) || typeof m.journeyId !== 'string') {
    return false;
  }

  // Optional fields must have correct types if present
  if ('mode' in m && typeof m.mode !== 'string') {
    return false;
  }

  if ('input' in m && typeof m.input !== 'string') {
    return false;
  }

  if ('context' in m && (typeof m.context !== 'object' || m.context === null)) {
    return false;
  }

  return true;
}

/**
 * Create metadata builder for a specific journey
 * Returns a bound function that always uses the same journey ID
 */
export function createMetadataBuilderFor(journeyId: string) {
  return (options: Omit<MetadataBuilderOptions, 'journeyId'>) => {
    return buildJourneyMetadata({
      ...options,
      journeyId,
    });
  };
}

