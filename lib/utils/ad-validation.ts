/**
 * Feature: Ad Validation Utilities
 * Purpose: Reusable validation logic for ad publishing with status-based permissions
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

import type { AdStatus, AdVariant } from '@/lib/types/workspace'
import { canPublish, canEdit, canPause, canResume } from './ad-status'

export interface AdValidationState {
  selectedImageIndex: number | null
  adCopyStatus: string
  destinationStatus: string
  locationStatus: string
  audienceStatus: string
  isMetaConnectionComplete: boolean
  hasPaymentMethod: boolean
  isBudgetComplete: boolean
  goalStatus?: string
}

export interface AdValidationResult {
  isValid: boolean
  missingRequirements: string[]
}

export interface StatusValidationResult {
  canPerformAction: boolean
  reason?: string
}

/**
 * Validates all required sections for ad publishing
 * @param state - Current state of all ad sections
 * @returns Validation result with list of missing requirements
 */
export function validateAdForPublish(state: AdValidationState): AdValidationResult {
  const missingRequirements: string[] = []

  if (state.selectedImageIndex === null) {
    missingRequirements.push('Select an ad creative')
  }

  if (state.adCopyStatus !== 'completed') {
    missingRequirements.push('Complete ad copy selection')
  }

  if (state.destinationStatus !== 'completed') {
    missingRequirements.push('Configure ad destination (form, URL, or phone)')
  }

  if (state.locationStatus !== 'completed') {
    missingRequirements.push('Set target locations')
  }

  if (state.audienceStatus !== 'completed') {
    missingRequirements.push('Define target audience')
  }

  if (!state.isMetaConnectionComplete) {
    missingRequirements.push('Connect Facebook & Instagram')
  }

  if (!state.hasPaymentMethod) {
    missingRequirements.push('Add payment method')
  }

  if (!state.isBudgetComplete) {
    missingRequirements.push('Set campaign budget')
  }

  return {
    isValid: missingRequirements.length === 0,
    missingRequirements,
  }
}

/**
 * Generates a user-friendly error message from validation result
 * @param result - Validation result
 * @returns Formatted error message
 */
export function formatValidationError(result: AdValidationResult): string {
  if (result.isValid) return ''
  
  if (result.missingRequirements.length === 1) {
    return result.missingRequirements[0]!
  }

  return `Please complete the following: ${result.missingRequirements.join(', ')}`
}

/**
 * Validates if an ad can be published based on its current status
 * @param ad - The ad to validate
 * @returns Validation result with reason if not allowed
 */
export function validatePublishPermission(ad: AdVariant): StatusValidationResult {
  if (!canPublish(ad)) {
    let reason = 'This ad cannot be published'
    
    if (ad.status === 'pending_approval') {
      reason = 'Ad is already under review by Meta'
    } else if (ad.status === 'active' || ad.status === 'learning') {
      reason = 'Ad is already live. Pause it first to make changes.'
    } else if (ad.status === 'paused') {
      reason = 'Use Resume instead to reactivate a paused ad'
    } else if (ad.status === 'archived') {
      reason = 'Archived ads cannot be republished'
    }
    
    return { canPerformAction: false, reason }
  }
  
  return { canPerformAction: true }
}

/**
 * Validates if an ad can be edited based on its current status
 * @param ad - The ad to validate
 * @returns Validation result with reason if not allowed
 */
export function validateEditPermission(ad: AdVariant): StatusValidationResult {
  if (!canEdit(ad)) {
    let reason = 'This ad cannot be edited'
    
    if (ad.status === 'pending_approval') {
      reason = 'Cannot edit an ad under review. Wait for approval or rejection first.'
    } else if (ad.status === 'active' || ad.status === 'learning') {
      reason = 'Pause the ad first before editing'
    } else if (ad.status === 'archived') {
      reason = 'Archived ads cannot be edited'
    }
    
    return { canPerformAction: false, reason }
  }
  
  return { canPerformAction: true }
}

/**
 * Validates if an ad can be paused based on its current status
 * @param ad - The ad to validate
 * @returns Validation result with reason if not allowed
 */
export function validatePausePermission(ad: AdVariant): StatusValidationResult {
  if (!canPause(ad)) {
    let reason = 'This ad cannot be paused'
    
    if (ad.status === 'draft') {
      reason = 'Draft ads are not running and cannot be paused'
    } else if (ad.status === 'pending_approval') {
      reason = 'Cannot pause an ad under review'
    } else if (ad.status === 'paused') {
      reason = 'Ad is already paused'
    } else if (ad.status === 'rejected') {
      reason = 'Rejected ads are not running'
    }
    
    return { canPerformAction: false, reason }
  }
  
  return { canPerformAction: true }
}

/**
 * Validates if an ad can be resumed based on its current status
 * @param ad - The ad to validate
 * @returns Validation result with reason if not allowed
 */
export function validateResumePermission(ad: AdVariant): StatusValidationResult {
  if (!canResume(ad)) {
    let reason = 'This ad cannot be resumed'
    
    if (ad.status === 'draft') {
      reason = 'Publish the ad first before it can run'
    } else if (ad.status === 'pending_approval') {
      reason = 'Wait for approval before resuming'
    } else if (ad.status === 'active' || ad.status === 'learning') {
      reason = 'Ad is already running'
    } else if (ad.status === 'rejected') {
      reason = 'Fix issues and republish the ad'
    }
    
    return { canPerformAction: false, reason }
  }
  
  return { canPerformAction: true }
}

/**
 * Gets user-friendly action availability message
 * @param ad - The ad to check
 * @returns Object with available actions and their reasons
 */
export function getAdActionAvailability(ad: AdVariant) {
  return {
    canPublish: validatePublishPermission(ad),
    canEdit: validateEditPermission(ad),
    canPause: validatePausePermission(ad),
    canResume: validateResumePermission(ad),
  }
}

