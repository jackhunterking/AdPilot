/**
 * Feature: Location Metadata Builder
 * Purpose: Create metadata for location setup messages
 * Microservices: Pure function, no side effects
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

import type { JourneyMetadata } from '@/lib/journeys/types/journey-contracts';

export function createLocationMetadata(
  mode: 'include' | 'exclude',
  input: string
): JourneyMetadata {
  return {
    journeyId: 'location',
    mode,
    input,
    context: {
      timestamp: new Date().toISOString(),
      source: 'chat_input',
      locationSetupMode: true,
      locationMode: mode,
      locationInput: input
    }
  };
}

