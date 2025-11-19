/**
 * Feature: Journey Event Bus
 * Purpose: Cross-journey communication and event handling
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

import type { JourneyEvent, EventBus, EventHandler } from '../types/journey-contracts';

/**
 * Event Bus Implementation
 * Enables decoupled communication between journeys
 */
class EventBusImpl implements EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private onceListeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * Emit an event
   */
  emit<TPayload = unknown>(type: string, payload: TPayload, source?: string): void {
    const event: JourneyEvent<TPayload> = {
      type,
      journeyId: source || 'unknown',
      payload,
      timestamp: Date.now(),
      source,
    };

    // Call regular listeners
    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const handler of listeners) {
        this.callHandler(handler, event);
      }
    }

    // Call once listeners
    const onceListeners = this.onceListeners.get(type);
    if (onceListeners) {
      for (const handler of onceListeners) {
        this.callHandler(handler, event);
      }
      // Clear once listeners after calling
      this.onceListeners.delete(type);
    }

    // Also emit to wildcard listeners (type: '*')
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      for (const handler of wildcardListeners) {
        this.callHandler(handler, event);
      }
    }
  }

  /**
   * Subscribe to events
   */
  on<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const listeners = this.listeners.get(type)!;
    listeners.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.off(type, handler);
    };
  }

  /**
   * Subscribe to events once
   */
  once<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): () => void {
    if (!this.onceListeners.has(type)) {
      this.onceListeners.set(type, new Set());
    }

    const listeners = this.onceListeners.get(type)!;
    listeners.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      const onceListeners = this.onceListeners.get(type);
      if (onceListeners) {
        onceListeners.delete(handler as EventHandler);
      }
    };
  }

  /**
   * Unsubscribe from events
   */
  off<TPayload = unknown>(type: string, handler: EventHandler<TPayload>): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(handler as EventHandler);
      if (listeners.size === 0) {
        this.listeners.delete(type);
      }
    }

    const onceListeners = this.onceListeners.get(type);
    if (onceListeners) {
      onceListeners.delete(handler as EventHandler);
      if (onceListeners.size === 0) {
        this.onceListeners.delete(type);
      }
    }
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * Call event handler with error handling
   */
  private callHandler<TPayload = unknown>(
    handler: EventHandler<TPayload>,
    event: JourneyEvent<TPayload>
  ): void {
    try {
      const result = handler(event);
      
      // Handle async handlers
      if (result instanceof Promise) {
        result.catch((error: Error) => {
          console.error(`[EventBus] Error in async handler for ${event.type}:`, error);
        });
      }
    } catch (error) {
      console.error(`[EventBus] Error in handler for ${event.type}:`, error);
    }
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(type?: string): number {
    if (type) {
      const listeners = this.listeners.get(type);
      const onceListeners = this.onceListeners.get(type);
      return (listeners?.size || 0) + (onceListeners?.size || 0);
    }

    // Total count
    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.size;
    }
    for (const listeners of this.onceListeners.values()) {
      total += listeners.size;
    }
    return total;
  }
}

// Singleton instance
const eventBus = new EventBusImpl();

/**
 * Get the global event bus
 */
export function getEventBus(): EventBus {
  return eventBus;
}

/**
 * Convenience function to emit event
 */
export function emitJourneyEvent<TPayload = unknown>(
  type: string,
  payload: TPayload,
  source?: string
): void {
  eventBus.emit(type, payload, source);
}

/**
 * Convenience function to listen to events
 */
export function onJourneyEvent<TPayload = unknown>(
  type: string,
  handler: EventHandler<TPayload>
): () => void {
  return eventBus.on(type, handler);
}

/**
 * Create a typed event emitter for a specific journey
 */
export function createJourneyEventEmitter<TEvents extends Record<string, unknown>>(journeyId: string) {
  return {
    emit<K extends keyof TEvents>(type: K, payload: TEvents[K]): void {
      eventBus.emit(type as string, payload, journeyId);
    },

    on<K extends keyof TEvents>(type: K, handler: EventHandler<TEvents[K]>): () => void {
      return eventBus.on(type as string, handler);
    },

    once<K extends keyof TEvents>(type: K, handler: EventHandler<TEvents[K]>): () => void {
      return eventBus.once(type as string, handler);
    },

    off<K extends keyof TEvents>(type: K, handler: EventHandler<TEvents[K]>): void {
      eventBus.off(type as string, handler);
    },
  };
}

// Export singleton
export { eventBus };

