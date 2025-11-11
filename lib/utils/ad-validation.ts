/**
 * Feature: Ad Validation Utilities
 * Purpose: Reusable validation logic for ad publishing
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

export interface AdValidationState {
  selectedImageIndex: number | null
  adCopyStatus: string
  destinationStatus: string
  locationStatus: string
  audienceStatus: string
  isMetaConnectionComplete: boolean
  hasPaymentMethod: boolean
  isBudgetComplete: boolean
}

export interface AdValidationResult {
  isValid: boolean
  missingRequirements: string[]
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

