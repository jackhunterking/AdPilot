/**
 * Feature: Audience State Persistence Service
 * Purpose: Handle saving/loading XState machine snapshots to/from database
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 *  - XState v5 Persistence: https://stately.ai/docs/persistence
 */

import type {
  AudienceMachineContext,
  AudienceMachineState,
  PersistedAudienceState,
  LegacyAudienceState,
} from '@/lib/machines/audience/types';
import {
  MACHINE_CONFIG,
  TIMING,
  STATE_TO_LEGACY_STATUS,
  LEGACY_STATUS_TO_STATE,
} from '@/lib/machines/audience/constants';

// ============================================
// Types
// ============================================

interface SaveStateParams {
  campaignId: string;
  machineState: AudienceMachineState;
  context: AudienceMachineContext;
}

interface LoadStateResult {
  state: PersistedAudienceState | null;
  wasLegacy: boolean;
}

// ============================================
// Persistence Service
// ============================================

export class AudienceStatePersistence {
  private static instance: AudienceStatePersistence;

  private constructor() {}

  public static getInstance(): AudienceStatePersistence {
    if (!AudienceStatePersistence.instance) {
      AudienceStatePersistence.instance = new AudienceStatePersistence();
    }
    return AudienceStatePersistence.instance;
  }

  // ============================================
  // Save Operations
  // ============================================

  /**
   * Save state machine snapshot to database
   * Includes retry logic with exponential backoff
   */
  public async saveState(params: SaveStateParams): Promise<boolean> {
    const { campaignId, machineState, context } = params;

    const persistedState: PersistedAudienceState = {
      version: MACHINE_CONFIG.SCHEMA_VERSION,
      machineState,
      context: {
        ...context,
        metadata: {
          ...context.metadata,
          campaignId,
          lastModified: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return this.saveWithRetry(campaignId, persistedState);
  }

  /**
   * Save with retry logic and exponential backoff
   */
  private async saveWithRetry(
    campaignId: string,
    state: PersistedAudienceState,
    attempt: number = 1
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience_data: state }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      if (MACHINE_CONFIG.DEBUG) {
        console.log('[AudienceStatePersistence] ✅ Saved state:', state.machineState);
      }

      return true;
    } catch (error) {
      console.error(
        `[AudienceStatePersistence] ❌ Save attempt ${attempt}/${TIMING.MAX_RETRIES} failed:`,
        error
      );

      if (attempt < TIMING.MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * TIMING.RETRY_BASE_DELAY_MS;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.saveWithRetry(campaignId, state, attempt + 1);
      }

      // All retries exhausted
      console.error('[AudienceStatePersistence] ❌ All save attempts failed');
      return false;
    }
  }

  // ============================================
  // Load Operations
  // ============================================

  /**
   * Load state from database
   * Handles both new XState format and legacy format
   */
  public async loadState(campaignId: string): Promise<LoadStateResult> {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const audienceData = data.campaign?.campaign_states?.audience_data;

      if (!audienceData) {
        if (MACHINE_CONFIG.DEBUG) {
          console.log('[AudienceStatePersistence] No saved state found');
        }
        return { state: null, wasLegacy: false };
      }

      // Check if it's new format (has version key)
      if (audienceData.version) {
        if (MACHINE_CONFIG.DEBUG) {
          console.log('[AudienceStatePersistence] ✅ Loaded XState format');
        }
        return { state: audienceData as PersistedAudienceState, wasLegacy: false };
      }

      // It's legacy format, migrate it
      if (MACHINE_CONFIG.DEBUG) {
        console.log('[AudienceStatePersistence] 🔄 Migrating legacy format');
      }
      const migrated = this.migrateLegacyState(audienceData as LegacyAudienceState, campaignId);
      return { state: migrated, wasLegacy: true };
    } catch (error) {
      console.error('[AudienceStatePersistence] ❌ Failed to load state:', error);
      return { state: null, wasLegacy: false };
    }
  }

  // ============================================
  // Migration Operations
  // ============================================

  /**
   * Migrate legacy state format to new XState format
   */
  public migrateLegacyState(
    legacy: LegacyAudienceState,
    campaignId: string
  ): PersistedAudienceState {
    // Determine machine state from legacy status and mode
    let machineState: AudienceMachineState;
    
    if (legacy.status === 'completed') {
      // Use mode to determine if AI or manual completed
      machineState = legacy.targeting.mode === 'ai' ? 'aiCompleted' : 'manualCompleted';
    } else {
      // Map other statuses
      machineState = LEGACY_STATUS_TO_STATE[legacy.status] || 'idle';
    }

    // Build new context from legacy targeting
    const context: AudienceMachineContext = {
      mode: legacy.targeting.mode,
      advantage_plus_enabled: legacy.targeting.advantage_plus_enabled || false,
      description: legacy.targeting.description,
      demographics: legacy.targeting.demographics,
      detailedTargeting: legacy.targeting.detailedTargeting,
      errorMessage: legacy.errorMessage,
      metadata: {
        lastModified: new Date().toISOString(),
        transitionCount: 0,
        campaignId,
      },
    };

    return {
      version: MACHINE_CONFIG.SCHEMA_VERSION,
      machineState,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert XState format to legacy format (for backward compatibility)
   * Used during gradual rollout when some components still use old context
   */
  public convertToLegacy(persisted: PersistedAudienceState): LegacyAudienceState {
    const { machineState, context } = persisted;

    // Map machine state to legacy status
    const status = STATE_TO_LEGACY_STATUS[machineState] || 'idle';

    return {
      status,
      targeting: {
        mode: context.mode,
        advantage_plus_enabled: context.advantage_plus_enabled,
        description: context.description,
        demographics: context.demographics,
        detailedTargeting: context.detailedTargeting,
      },
      errorMessage: context.errorMessage,
      isSelected: machineState.includes('Completed'),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Check if state is in legacy format
   */
  public isLegacyFormat(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return 'status' in obj && !('version' in obj);
  }

  /**
   * Check if state is in XState format
   */
  public isXStateFormat(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return 'version' in obj && 'machineState' in obj && 'context' in obj;
  }

  /**
   * Validate XState format structure
   */
  public validateXStateFormat(data: unknown): data is PersistedAudienceState {
    if (!this.isXStateFormat(data)) return false;
    
    const obj = data as Record<string, unknown>;
    
    // Check version is a number
    if (typeof obj.version !== 'number') return false;
    
    // Check machineState is a string
    if (typeof obj.machineState !== 'string') return false;
    
    // Check context exists and is an object
    if (!obj.context || typeof obj.context !== 'object') return false;
    
    const context = obj.context as Record<string, unknown>;
    
    // Check required context fields
    if (!('mode' in context)) return false;
    if (context.mode !== 'ai' && context.mode !== 'manual') return false;
    
    return true;
  }

  /**
   * Clear audience state for a campaign
   */
  public async clearState(campaignId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience_data: null }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (MACHINE_CONFIG.DEBUG) {
        console.log('[AudienceStatePersistence] ✅ Cleared state');
      }

      return true;
    } catch (error) {
      console.error('[AudienceStatePersistence] ❌ Failed to clear state:', error);
      return false;
    }
  }
}

// Export singleton instance
export const audienceStatePersistence = AudienceStatePersistence.getInstance();

