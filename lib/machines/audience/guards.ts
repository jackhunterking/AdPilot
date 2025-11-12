/**
 * Feature: Audience State Machine Guards
 * Purpose: Guard functions that control state transitions
 * References:
 *  - XState v5 Guards: https://stately.ai/docs/guards
 */

import type { AudienceMachineContext, AudienceMachineEvent } from './types';

// ============================================
// Guard Functions
// ============================================

/**
 * Check if we're not already in the target mode
 * Prevents unnecessary mode switches
 */
export function isNotAlreadyInMode(
  { context }: { context: AudienceMachineContext },
  event: AudienceMachineEvent
): boolean {
  if (event.type === 'SWITCH_TO_AI') {
    return context.mode !== 'ai';
  }
  if (event.type === 'SWITCH_TO_MANUAL') {
    return context.mode !== 'manual';
  }
  return true;
}

/**
 * Check if we're in AI mode
 * Used for conditional transitions
 */
export function isAIMode({ context }: { context: AudienceMachineContext }): boolean {
  return context.mode === 'ai';
}

/**
 * Check if we're in manual mode
 * Used for conditional transitions
 */
export function isManualMode({ context }: { context: AudienceMachineContext }): boolean {
  return context.mode === 'manual';
}

/**
 * Check if manual targeting has complete demographics
 * Used to validate manual targeting setup
 */
export function hasCompleteDemographics({ context }: { context: AudienceMachineContext }): boolean {
  const { demographics } = context;
  return !!(
    demographics &&
    typeof demographics.ageMin === 'number' &&
    typeof demographics.ageMax === 'number' &&
    demographics.gender
  );
}

/**
 * Check if manual targeting has at least one interest or behavior
 * Used to validate targeting parameters
 */
export function hasTargetingCriteria({ context }: { context: AudienceMachineContext }): boolean {
  const { detailedTargeting } = context;
  return !!(
    detailedTargeting &&
    ((detailedTargeting.interests && detailedTargeting.interests.length > 0) ||
     (detailedTargeting.behaviors && detailedTargeting.behaviors.length > 0))
  );
}

/**
 * Check if we can retry after error
 * Prevents infinite retry loops
 */
export function canRetry({ context }: { context: AudienceMachineContext }): boolean {
  // Allow retries if transition count is reasonable
  return context.metadata.transitionCount < 10;
}

/**
 * Check if demographics are valid
 * Validates age range and gender
 */
export function areValidDemographics(
  { context }: { context: AudienceMachineContext }
): boolean {
  const { demographics } = context;
  if (!demographics) return false;
  
  const { ageMin, ageMax, gender } = demographics;
  
  // Age validation
  if (typeof ageMin !== 'number' || typeof ageMax !== 'number') return false;
  if (ageMin < 13 || ageMax > 65) return false; // Meta's age limits
  if (ageMin >= ageMax) return false;
  
  // Gender validation
  if (!['all', 'male', 'female'].includes(gender as string)) return false;
  
  return true;
}

/**
 * Check if switching is currently allowed
 * Based on current state and context
 */
export function canSwitchModes({ context }: { context: AudienceMachineContext }): boolean {
  // Can only switch from completed states
  // This is enforced by state machine structure, but useful for UI
  return true; // Will be controlled by state transitions
}

