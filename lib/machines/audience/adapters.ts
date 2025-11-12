/**
 * Feature: Audience State Adapters
 * Purpose: Convert between XState format and legacy format for gradual migration
 * References:
 *  - XState v5: https://stately.ai/docs/xstate
 */

import type {
  PersistedAudienceState,
  LegacyAudienceState,
  AudienceMachineContext,
  AudienceMachineState,
} from './types';
import { STATE_TO_LEGACY_STATUS, LEGACY_STATUS_TO_STATE, MACHINE_CONFIG } from './constants';

// ============================================
// XState → Legacy Adapters
// ============================================

/**
 * Convert XState persisted state to legacy format
 * Used when XState is enabled but some components still expect legacy format
 */
export function xstateToLegacy(xstate: PersistedAudienceState): LegacyAudienceState {
  const { machineState, context } = xstate;

  return {
    status: STATE_TO_LEGACY_STATUS[machineState] || 'idle',
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

/**
 * Convert XState machine context to legacy targeting object
 */
export function contextToLegacyTargeting(context: AudienceMachineContext): LegacyAudienceState['targeting'] {
  return {
    mode: context.mode,
    advantage_plus_enabled: context.advantage_plus_enabled,
    description: context.description,
    demographics: context.demographics,
    detailedTargeting: context.detailedTargeting,
  };
}

// ============================================
// Legacy → XState Adapters
// ============================================

/**
 * Convert legacy state to XState format
 * Used during initial migration when loading old data
 */
export function legacyToXState(legacy: LegacyAudienceState, campaignId: string): PersistedAudienceState {
  // Determine machine state from legacy status and mode
  let machineState: AudienceMachineState;

  if (legacy.status === 'completed') {
    // Use mode to determine completed state
    machineState = legacy.targeting.mode === 'ai' ? 'aiCompleted' : 'manualCompleted';
  } else {
    // Map legacy status to machine state
    machineState = LEGACY_STATUS_TO_STATE[legacy.status] || 'idle';
  }

  // Build XState context from legacy targeting
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
 * Convert legacy targeting to XState context
 */
export function legacyTargetingToContext(
  targeting: LegacyAudienceState['targeting'],
  campaignId?: string
): AudienceMachineContext {
  return {
    mode: targeting.mode,
    advantage_plus_enabled: targeting.advantage_plus_enabled || false,
    description: targeting.description,
    demographics: targeting.demographics,
    detailedTargeting: targeting.detailedTargeting,
    errorMessage: undefined,
    metadata: {
      lastModified: new Date().toISOString(),
      transitionCount: 0,
      campaignId,
    },
  };
}

// ============================================
// Format Detection
// ============================================

/**
 * Detect which format the data is in
 */
export function detectFormat(data: unknown): 'xstate' | 'legacy' | 'invalid' {
  if (!data || typeof data !== 'object') {
    return 'invalid';
  }

  const obj = data as Record<string, unknown>;

  // Check for XState format (has version key)
  if ('version' in obj && 'machineState' in obj && 'context' in obj) {
    return 'xstate';
  }

  // Check for legacy format (has status key)
  if ('status' in obj && 'targeting' in obj) {
    return 'legacy';
  }

  return 'invalid';
}

/**
 * Auto-detect format and convert to XState if needed
 */
export function ensureXStateFormat(
  data: unknown,
  campaignId: string
): PersistedAudienceState | null {
  const format = detectFormat(data);

  switch (format) {
    case 'xstate':
      return data as PersistedAudienceState;
    case 'legacy':
      return legacyToXState(data as LegacyAudienceState, campaignId);
    case 'invalid':
      return null;
  }
}

/**
 * Auto-detect format and convert to legacy if needed
 */
export function ensureLegacyFormat(
  data: unknown,
  campaignId: string
): LegacyAudienceState | null {
  const format = detectFormat(data);

  switch (format) {
    case 'xstate':
      return xstateToLegacy(data as PersistedAudienceState);
    case 'legacy':
      return data as LegacyAudienceState;
    case 'invalid':
      return null;
  }
}

// ============================================
// Validation
// ============================================

/**
 * Validate XState format structure
 */
export function isValidXStateFormat(data: unknown): data is PersistedAudienceState {
  if (detectFormat(data) !== 'xstate') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check version is a number
  if (typeof obj.version !== 'number') {
    return false;
  }

  // Check machineState is a string
  if (typeof obj.machineState !== 'string') {
    return false;
  }

  // Check context exists and has required fields
  if (!obj.context || typeof obj.context !== 'object') {
    return false;
  }

  const context = obj.context as Record<string, unknown>;

  // Check mode is valid
  if (context.mode !== 'ai' && context.mode !== 'manual') {
    return false;
  }

  return true;
}

/**
 * Validate legacy format structure
 */
export function isValidLegacyFormat(data: unknown): data is LegacyAudienceState {
  if (detectFormat(data) !== 'legacy') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check status is a string
  if (typeof obj.status !== 'string') {
    return false;
  }

  // Check targeting exists and has mode
  if (!obj.targeting || typeof obj.targeting !== 'object') {
    return false;
  }

  const targeting = obj.targeting as Record<string, unknown>;

  // Check mode is valid
  if (targeting.mode !== 'ai' && targeting.mode !== 'manual') {
    return false;
  }

  return true;
}

// ============================================
// Batch Migration Utilities
// ============================================

/**
 * Migrate multiple legacy states to XState format
 * Useful for batch migration operations
 */
export function batchMigrateLegacyToXState(
  legacyStates: Array<{ campaignId: string; state: LegacyAudienceState }>
): Array<{ campaignId: string; state: PersistedAudienceState }> {
  return legacyStates.map(({ campaignId, state }) => ({
    campaignId,
    state: legacyToXState(state, campaignId),
  }));
}

/**
 * Generate migration report
 * Shows statistics about what was migrated
 */
export interface MigrationReport {
  total: number;
  migrated: number;
  failed: number;
  errors: Array<{ campaignId: string; error: string }>;
}

export function generateMigrationReport(
  results: Array<{ campaignId: string; success: boolean; error?: string }>
): MigrationReport {
  return {
    total: results.length,
    migrated: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    errors: results
      .filter(r => !r.success)
      .map(r => ({
        campaignId: r.campaignId,
        error: r.error || 'Unknown error',
      })),
  };
}

