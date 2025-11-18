/**
 * Feature: Location Confirmation Messages
 * Purpose: Helper utilities for creating location confirmation messages with metadata
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import type { UIMessage } from 'ai'

export interface LocationCardData {
  id: string
  name: string
  type: 'city' | 'region' | 'country' | 'radius'
  mode: 'include' | 'exclude'
  radius?: number
}

/**
 * Creates a UIMessage with location confirmation metadata
 * This message will be rendered as individual location cards in the chat UI
 * 
 * @param locations - Array of location data to display as cards
 * @returns UIMessage with metadata.type = 'location_confirmation'
 */
export function createLocationConfirmationMessage(
  locations: LocationCardData[]
): UIMessage {
  return {
    id: `msg-loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'assistant',
    parts: [
      { type: 'text', text: '' }  // Empty text (won't display, cards render from metadata)
    ],
    metadata: {
      type: 'location_confirmation',
      locations: locations,
      timestamp: new Date().toISOString()
    }
  }
}

