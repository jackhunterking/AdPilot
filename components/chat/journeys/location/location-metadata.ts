/**
 * Feature: Location Metadata Builder
 * Purpose: Create metadata for location setup messages
 * Microservices: Pure function, no side effects
 * References:
 *  - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

export function createLocationMetadata(
  mode: 'include' | 'exclude',
  input: string
): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    source: 'chat_input',
    locationSetupMode: true,
    locationMode: mode,  // FIX: Mode included in metadata
    locationInput: input
  };
}

