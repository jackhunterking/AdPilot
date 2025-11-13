/**
 * Feature: Meta Connection Event System
 * Purpose: Type-safe custom events for Meta connection state synchronization across components
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Facebook Login: https://developers.facebook.com/docs/facebook-login
 */

/**
 * Event payload for Meta connection changes
 */
export interface MetaConnectionChangePayload {
  campaignId: string
  status: 'connected' | 'disconnected'
  timestamp: number
}

/**
 * Event payload for Meta payment updates
 */
export interface MetaPaymentUpdatePayload {
  campaignId: string
  paymentStatus: 'verified' | 'missing' | 'processing'
  timestamp: number
}

/**
 * Event payload for Meta disconnection
 */
export interface MetaDisconnectionPayload {
  campaignId: string
  timestamp: number
}

/**
 * Event payload for Meta connection data updates in localStorage
 */
export interface MetaConnectionUpdatedPayload {
  campaignId: string
  timestamp: number
}

/**
 * Custom event types for Meta integration
 */
export type MetaConnectionChangeEvent = CustomEvent<MetaConnectionChangePayload>
export type MetaPaymentUpdateEvent = CustomEvent<MetaPaymentUpdatePayload>
export type MetaDisconnectionEvent = CustomEvent<MetaDisconnectionPayload>
export type MetaConnectionUpdatedEvent = CustomEvent<MetaConnectionUpdatedPayload>

/**
 * Event names - centralized constants
 */
export const META_EVENTS = {
  CONNECTION_CHANGED: 'meta-connection-changed',
  DISCONNECTION: 'meta-disconnection',
  PAYMENT_UPDATED: 'meta-payment-updated',
  CONNECTION_UPDATED: 'meta-connection-updated', // Fired when localStorage connection data changes
} as const

/**
 * Emit a Meta connection change event
 * @param campaignId - The campaign ID for this connection
 * @param status - The new connection status
 */
export function emitMetaConnectionChange(campaignId: string, status: 'connected' | 'disconnected'): void {
  if (typeof window === 'undefined') return
  
  try {
    if (!campaignId) {
      console.warn('[MetaEvents] Cannot emit connection change without campaignId')
      return
    }

    const event = new CustomEvent<MetaConnectionChangePayload>(META_EVENTS.CONNECTION_CHANGED, {
      detail: {
        campaignId,
        status,
        timestamp: Date.now(),
      },
      bubbles: false,
      cancelable: false,
    })

    window.dispatchEvent(event)
    
    console.log('[MetaEvents] Emitted connection change:', { campaignId, status })
  } catch (error) {
    console.error('[MetaEvents] Failed to emit connection change:', error)
  }
}

/**
 * Emit a Meta disconnection event
 * @param campaignId - The campaign ID for this disconnection
 */
export function emitMetaDisconnection(campaignId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    if (!campaignId) {
      console.warn('[MetaEvents] Cannot emit disconnection without campaignId')
      return
    }

    const event = new CustomEvent<MetaDisconnectionPayload>(META_EVENTS.DISCONNECTION, {
      detail: {
        campaignId,
        timestamp: Date.now(),
      },
      bubbles: false,
      cancelable: false,
    })

    window.dispatchEvent(event)
    
    console.log('[MetaEvents] Emitted disconnection:', { campaignId })
  } catch (error) {
    console.error('[MetaEvents] Failed to emit disconnection:', error)
  }
}

/**
 * Emit a Meta payment update event
 * @param campaignId - The campaign ID for this payment update
 * @param paymentStatus - The new payment status
 */
export function emitMetaPaymentUpdate(
  campaignId: string,
  paymentStatus: 'verified' | 'missing' | 'processing'
): void {
  if (typeof window === 'undefined') return
  
  try {
    if (!campaignId) {
      console.warn('[MetaEvents] Cannot emit payment update without campaignId')
      return
    }

    const event = new CustomEvent<MetaPaymentUpdatePayload>(META_EVENTS.PAYMENT_UPDATED, {
      detail: {
        campaignId,
        paymentStatus,
        timestamp: Date.now(),
      },
      bubbles: false,
      cancelable: false,
    })

    window.dispatchEvent(event)
    
    console.log('[MetaEvents] Emitted payment update:', { campaignId, paymentStatus })
  } catch (error) {
    console.error('[MetaEvents] Failed to emit payment update:', error)
  }
}

/**
 * Type guard for Meta connection change events
 */
export function isMetaConnectionChangeEvent(event: Event): event is MetaConnectionChangeEvent {
  return event.type === META_EVENTS.CONNECTION_CHANGED
}

/**
 * Type guard for Meta payment update events
 */
export function isMetaPaymentUpdateEvent(event: Event): event is MetaPaymentUpdateEvent {
  return event.type === META_EVENTS.PAYMENT_UPDATED
}

/**
 * Type guard for Meta disconnection events
 */
export function isMetaDisconnectionEvent(event: Event): event is MetaDisconnectionEvent {
  return event.type === META_EVENTS.DISCONNECTION
}

/**
 * Emit a Meta connection updated event (for localStorage changes)
 * @param campaignId - The campaign ID for this connection update
 */
export function emitMetaConnectionUpdated(campaignId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    if (!campaignId) {
      console.warn('[MetaEvents] Cannot emit connection updated without campaignId')
      return
    }

    const event = new CustomEvent<MetaConnectionUpdatedPayload>(META_EVENTS.CONNECTION_UPDATED, {
      detail: {
        campaignId,
        timestamp: Date.now(),
      },
      bubbles: false,
      cancelable: false,
    })

    window.dispatchEvent(event)
    
    console.log('[MetaEvents] Emitted connection updated:', { campaignId })
  } catch (error) {
    console.error('[MetaEvents] Failed to emit connection updated:', error)
  }
}

/**
 * Type guard for Meta connection updated events
 */
export function isMetaConnectionUpdatedEvent(event: Event): event is MetaConnectionUpdatedEvent {
  return event.type === META_EVENTS.CONNECTION_UPDATED
}

