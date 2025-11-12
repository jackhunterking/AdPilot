/**
 * Feature: Audience State Machine Actions
 * Purpose: Action implementations for state transitions
 * References:
 *  - XState v5 Actions: https://stately.ai/docs/actions
 */

import { assign } from 'xstate';
import type {
  AudienceMachineContext,
  AudienceMachineEvent,
  Demographics,
  TargetingOption,
} from './types';
import { MACHINE_CONFIG, EVENT_NAMES } from './constants';

// ============================================
// Logging Actions
// ============================================

/**
 * Log state transitions for debugging
 */
export const logTransition = ({ context, event }: { context: AudienceMachineContext; event: AudienceMachineEvent }) => {
  if (MACHINE_CONFIG.DEBUG) {
    const eventName = EVENT_NAMES[event.type as keyof typeof EVENT_NAMES] || event.type;
    console.log(`[AudienceMachine] ${eventName}`, {
      mode: context.mode,
      transitionCount: context.metadata.transitionCount,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Log errors for debugging
 */
export const logError = ({ context, event }: { context: AudienceMachineContext; event: AudienceMachineEvent }) => {
  console.error(`[AudienceMachine] Error in transition`, {
    event: event.type,
    errorMessage: context.errorMessage,
    context,
  });
};

// ============================================
// Mode Setting Actions
// ============================================

/**
 * Set AI mode and clear manual targeting data
 */
export const setAIMode = assign({
  mode: 'ai',
  advantage_plus_enabled: true,
  // Clear manual targeting data
  description: undefined,
  demographics: undefined,
  detailedTargeting: undefined,
  errorMessage: undefined,
  metadata: ({ context }) => ({
    ...context.metadata,
    lastModified: new Date().toISOString(),
    transitionCount: context.metadata.transitionCount + 1,
  }),
});

/**
 * Set manual mode and clear AI flag
 */
export const setManualMode = assign({
  mode: 'manual',
  advantage_plus_enabled: false,
  errorMessage: undefined,
  metadata: ({ context }) => ({
    ...context.metadata,
    lastModified: new Date().toISOString(),
    transitionCount: context.metadata.transitionCount + 1,
  }),
});

// ============================================
// Data Update Actions
// ============================================

/**
 * Clear all manual targeting data
 */
export const clearManualData = assign({
  description: undefined,
  demographics: undefined,
  detailedTargeting: undefined,
});

/**
 * Update demographics from manual params generated event
 */
export const setGeneratedDemographics = assign(({ event }) => {
  if (event.type !== 'MANUAL_PARAMS_GENERATED') return {};
  
  return {
    demographics: event.demographics,
    detailedTargeting: {
      interests: event.interests,
      behaviors: event.behaviors,
      connections: [],
    },
    metadata: {
      lastModified: new Date().toISOString(),
      transitionCount: 0,
    },
  };
});

/**
 * Update demographics partially
 */
export const updateDemographics = assign(({ context, event }) => {
  if (event.type !== 'UPDATE_DEMOGRAPHICS') return {};
  
  return {
    demographics: {
      ...context.demographics,
      ...event.demographics,
    } as Demographics,
    metadata: {
      ...context.metadata,
      lastModified: new Date().toISOString(),
    },
  };
});

/**
 * Add interest to detailed targeting
 */
export const addInterest = assign(({ context, event }) => {
  if (event.type !== 'ADD_INTEREST') return {};
  
  const currentInterests = context.detailedTargeting?.interests || [];
  
  // Don't add if already exists
  if (currentInterests.some((i: TargetingOption) => i.id === event.interest.id)) {
    return {};
  }
  
  return {
    detailedTargeting: {
      ...context.detailedTargeting,
      interests: [...currentInterests, event.interest],
      behaviors: context.detailedTargeting?.behaviors || [],
      connections: context.detailedTargeting?.connections || [],
    },
    metadata: {
      ...context.metadata,
      lastModified: new Date().toISOString(),
    },
  };
});

/**
 * Remove interest from detailed targeting
 */
export const removeInterest = assign(({ context, event }) => {
  if (event.type !== 'REMOVE_INTEREST') return {};
  
  const currentInterests = context.detailedTargeting?.interests || [];
  
  return {
    detailedTargeting: {
      ...context.detailedTargeting,
      interests: currentInterests.filter((i: TargetingOption) => i.id !== event.interestId),
      behaviors: context.detailedTargeting?.behaviors || [],
      connections: context.detailedTargeting?.connections || [],
    },
    metadata: {
      ...context.metadata,
      lastModified: new Date().toISOString(),
    },
  };
});

/**
 * Add behavior to detailed targeting
 */
export const addBehavior = assign(({ context, event }) => {
  if (event.type !== 'ADD_BEHAVIOR') return {};
  
  const currentBehaviors = context.detailedTargeting?.behaviors || [];
  
  // Don't add if already exists
  if (currentBehaviors.some((b: TargetingOption) => b.id === event.behavior.id)) {
    return {};
  }
  
  return {
    detailedTargeting: {
      ...context.detailedTargeting,
      interests: context.detailedTargeting?.interests || [],
      behaviors: [...currentBehaviors, event.behavior],
      connections: context.detailedTargeting?.connections || [],
    },
    metadata: {
      ...context.metadata,
      lastModified: new Date().toISOString(),
    },
  };
});

/**
 * Remove behavior from detailed targeting
 */
export const removeBehavior = assign(({ context, event }) => {
  if (event.type !== 'REMOVE_BEHAVIOR') return {};
  
  const currentBehaviors = context.detailedTargeting?.behaviors || [];
  
  return {
    detailedTargeting: {
      ...context.detailedTargeting,
      interests: context.detailedTargeting?.interests || [],
      behaviors: currentBehaviors.filter((b: TargetingOption) => b.id !== event.behaviorId),
      connections: context.detailedTargeting?.connections || [],
    },
    metadata: {
      ...context.metadata,
      lastModified: new Date().toISOString(),
    },
  };
});

// ============================================
// Error Handling Actions
// ============================================

/**
 * Set error message
 */
export const setError = assign({
  errorMessage: (_: unknown, params: { error: string }) => params.error,
  metadata: ({ context }) => ({
    ...context.metadata,
    lastModified: new Date().toISOString(),
  }),
});

/**
 * Clear error message
 */
export const clearError = assign({
  errorMessage: undefined,
  metadata: ({ context }) => ({
    ...context.metadata,
    lastModified: new Date().toISOString(),
  }),
});

// ============================================
// Metadata Actions
// ============================================

/**
 * Increment transition counter
 */
export const incrementTransitionCount = assign({
  metadata: ({ context }) => ({
    ...context.metadata,
    transitionCount: context.metadata.transitionCount + 1,
    lastModified: new Date().toISOString(),
  }),
});

/**
 * Reset to initial state
 */
export const resetToInitial = assign({
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
});

