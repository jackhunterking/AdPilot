/**
 * Feature: Journey State Manager
 * Purpose: Persist and restore journey state across sessions
 * References:
 *  - Journey Contracts: lib/journeys/types/journey-contracts.ts
 */

import type { JourneyState, StateStorage } from '../types/journey-contracts';

/**
 * Browser Local Storage Implementation
 */
class LocalStateStorage implements StateStorage {
  private prefix = 'adpilot_journey_';

  private getKey(journeyId: string): string {
    return `${this.prefix}${journeyId}`;
  }

  get<TState extends JourneyState = JourneyState>(journeyId: string): TState | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const key = this.getKey(journeyId);
      const stored = localStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as TState;
      
      // Validate basic structure
      if (!parsed || typeof parsed !== 'object' || !('status' in parsed)) {
        console.warn(`[StateManager] Invalid state for journey ${journeyId}`);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error(`[StateManager] Error loading state for journey ${journeyId}:`, error);
      return null;
    }
  }

  set<TState extends JourneyState = JourneyState>(journeyId: string, state: TState): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const key = this.getKey(journeyId);
      const serialized = JSON.stringify(state);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`[StateManager] Error saving state for journey ${journeyId}:`, error);
    }
  }

  remove(journeyId: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const key = this.getKey(journeyId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[StateManager] Error removing state for journey ${journeyId}:`, error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Find all keys with our prefix
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key);
        }
      }

      // Remove all journey states
      for (const key of keys) {
        localStorage.removeItem(key);
      }

      console.log(`[StateManager] Cleared ${keys.length} journey states`);
    } catch (error) {
      console.error('[StateManager] Error clearing states:', error);
    }
  }
}

/**
 * In-Memory Storage Implementation (for SSR/testing)
 */
class MemoryStateStorage implements StateStorage {
  private storage = new Map<string, JourneyState>();

  get<TState extends JourneyState = JourneyState>(journeyId: string): TState | null {
    const state = this.storage.get(journeyId);
    return state ? (state as TState) : null;
  }

  set<TState extends JourneyState = JourneyState>(journeyId: string, state: TState): void {
    this.storage.set(journeyId, state);
  }

  remove(journeyId: string): void {
    this.storage.delete(journeyId);
  }

  clear(): void {
    this.storage.clear();
  }
}

// Singleton instances
let localStorageInstance: StateStorage | null = null;
let memoryStorageInstance: StateStorage | null = null;

/**
 * Get local storage instance (browser)
 */
export function getLocalStorage(): StateStorage {
  if (!localStorageInstance) {
    localStorageInstance = new LocalStateStorage();
  }
  return localStorageInstance;
}

/**
 * Get memory storage instance (SSR/testing)
 */
export function getMemoryStorage(): StateStorage {
  if (!memoryStorageInstance) {
    memoryStorageInstance = new MemoryStateStorage();
  }
  return memoryStorageInstance;
}

/**
 * Get appropriate storage based on environment
 */
export function getStorage(): StateStorage {
  if (typeof window !== 'undefined') {
    return getLocalStorage();
  }
  return getMemoryStorage();
}

/**
 * Journey State Manager
 * High-level API for managing journey state
 */
export class JourneyStateManager<TState extends JourneyState = JourneyState> {
  constructor(
    private journeyId: string,
    private storage: StateStorage = getStorage()
  ) {}

  /**
   * Load state from storage
   */
  load(): TState | null {
    return this.storage.get<TState>(this.journeyId);
  }

  /**
   * Save state to storage
   */
  save(state: TState): void {
    this.storage.set(this.journeyId, state);
  }

  /**
   * Update state partially
   */
  update(partial: Partial<TState>): void {
    const current = this.load();
    if (!current) {
      console.warn(`[StateManager] No state to update for journey ${this.journeyId}`);
      return;
    }

    const updated = { ...current, ...partial };
    this.save(updated);
  }

  /**
   * Remove state from storage
   */
  remove(): void {
    this.storage.remove(this.journeyId);
  }

  /**
   * Check if state exists
   */
  exists(): boolean {
    return this.load() !== null;
  }

  /**
   * Get or create state with default
   */
  getOrCreate(defaultState: TState): TState {
    const existing = this.load();
    if (existing) {
      return existing;
    }

    this.save(defaultState);
    return defaultState;
  }
}

/**
 * Create a state manager for a specific journey
 */
export function createStateManager<TState extends JourneyState = JourneyState>(
  journeyId: string,
  storage?: StateStorage
): JourneyStateManager<TState> {
  return new JourneyStateManager<TState>(journeyId, storage);
}

