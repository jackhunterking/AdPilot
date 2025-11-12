/**
 * Feature: Audience State Machine Constants
 * Purpose: Configuration constants for the audience targeting state machine
 * References:
 *  - XState v5: https://stately.ai/docs/xstate
 */

import type { AudienceMachineContext } from './types';

// ============================================
// Timing Constants
// ============================================

export const TIMING = {
  /** Delay for loading states to ensure UI shows feedback */
  TRANSITION_DELAY_MS: 500,
  
  /** Debounce for auto-save operations */
  AUTO_SAVE_DEBOUNCE_MS: 300,
  
  /** Retry delay base (exponential backoff) */
  RETRY_BASE_DELAY_MS: 1000,
  
  /** Maximum retries for failed operations */
  MAX_RETRIES: 3,
} as const;

// ============================================
// State Machine Configuration
// ============================================

export const MACHINE_CONFIG = {
  /** State machine ID for debugging */
  ID: 'audience-targeting',
  
  /** Schema version for persistence */
  SCHEMA_VERSION: 1,
  
  /** Enable development logging */
  DEBUG: process.env.NODE_ENV === 'development',
} as const;

// ============================================
// Default Values
// ============================================

export const DEFAULT_DEMOGRAPHICS = {
  ageMin: 18,
  ageMax: 65,
  gender: 'all' as const,
  languages: [],
};

export const DEFAULT_DETAILED_TARGETING = {
  interests: [],
  behaviors: [],
  connections: [],
};

export const INITIAL_CONTEXT: AudienceMachineContext = {
  mode: 'ai',
  advantage_plus_enabled: false,
  description: undefined,
  demographics: undefined,
  detailedTargeting: undefined,
  errorMessage: undefined,
  metadata: {
    lastModified: new Date().toISOString(),
    transitionCount: 0,
  },
};

// ============================================
// State Mappings
// ============================================

/**
 * Maps machine states to legacy status values for backward compatibility
 */
export const STATE_TO_LEGACY_STATUS = {
  idle: 'idle',
  enablingAI: 'generating',
  aiCompleted: 'completed',
  gatheringManualInfo: 'gathering-info',
  generatingManualParams: 'generating',
  manualRefining: 'setup-in-progress',
  manualCompleted: 'completed',
  switching: 'switching',
  error: 'error',
} as const;

/**
 * Maps legacy status values to machine states for migration
 */
export const LEGACY_STATUS_TO_STATE = {
  idle: 'idle',
  generating: 'enablingAI',
  'gathering-info': 'gatheringManualInfo',
  'setup-in-progress': 'manualRefining',
  switching: 'switching',
  completed: 'aiCompleted', // Default to AI, will be adjusted based on mode
  error: 'error',
} as const;

// ============================================
// Feature Flags
// ============================================

export const FEATURE_FLAGS = {
  /** Enable XState machine (vs legacy context) */
  USE_XSTATE_MACHINE: process.env.NEXT_PUBLIC_USE_XSTATE_AUDIENCE === 'true',
  
  /** Enable XState DevTools in development */
  ENABLE_DEVTOOLS: process.env.NODE_ENV === 'development',
  
  /** Enable detailed logging */
  ENABLE_LOGGING: process.env.NEXT_PUBLIC_DEBUG === '1' || process.env.NODE_ENV === 'development',
} as const;

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  PERSISTENCE_FAILED: 'Failed to save audience targeting state. Please try again.',
  LOAD_FAILED: 'Failed to load saved audience targeting. Starting fresh.',
  INVALID_TRANSITION: 'Cannot perform this action in the current state.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// ============================================
// Event Names (for logging/debugging)
// ============================================

export const EVENT_NAMES = {
  SELECT_AI_MODE: 'User selected AI Advantage+ mode',
  SELECT_MANUAL_MODE: 'User selected manual targeting mode',
  SWITCH_TO_AI: 'Switching from manual to AI mode',
  SWITCH_TO_MANUAL: 'Switching from AI to manual mode',
  AI_ENABLE_SUCCESS: 'AI Advantage+ enabled successfully',
  MANUAL_PARAMS_GENERATED: 'Manual targeting parameters generated',
  MANUAL_PARAMS_CONFIRMED: 'Manual targeting parameters confirmed',
  UPDATE_DEMOGRAPHICS: 'Demographics updated',
  ADD_INTEREST: 'Interest added',
  REMOVE_INTEREST: 'Interest removed',
  ADD_BEHAVIOR: 'Behavior added',
  REMOVE_BEHAVIOR: 'Behavior removed',
  RETRY_ERROR: 'Retrying after error',
  RESET: 'Resetting audience targeting',
} as const;

