/**
 * Feature: Error Classifier
 * Purpose: Classify and categorize Meta API errors
 * References:
 *  - Meta Marketing API Errors: https://developers.facebook.com/docs/marketing-api/error-reference
 */

import type { PublishErrorCode } from '../../types/workspace'

export interface ClassifiedError {
  code: PublishErrorCode
  category: 'validation' | 'authentication' | 'authorization' | 'rate_limit' | 'server' | 'business_logic'
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoverable: boolean
}

/**
 * Classify Meta API error by error code
 */
export function classifyMetaError(errorCode: number | string, errorMessage: string): ClassifiedError {
  const code = typeof errorCode === 'string' ? parseInt(errorCode) : errorCode

  // Authentication errors (1xxx)
  if (code >= 100 && code < 200) {
    return {
      code: 'token_expired',
      category: 'authentication',
      severity: 'high',
      recoverable: true
    }
  }

  // Permission/Authorization errors (2xx)
  if (code >= 200 && code < 300) {
    return {
      code: 'policy_violation',
      category: 'authorization',
      severity: 'high',
      recoverable: true
    }
  }

  // Rate limiting (4xx, 17, 32, 613)
  if ([4, 17, 32, 613].includes(code)) {
    return {
      code: 'api_error',
      category: 'rate_limit',
      severity: 'medium',
      recoverable: true
    }
  }

  // Payment issues (2650+)
  if (code >= 2650 && code < 2700) {
    return {
      code: 'payment_required',
      category: 'business_logic',
      severity: 'high',
      recoverable: true
    }
  }

  // Ad policy violations (1487xxx)
  if (code >= 1487000 && code < 1488000) {
    return {
      code: 'policy_violation',
      category: 'business_logic',
      severity: 'high',
      recoverable: true
    }
  }

  // Validation errors (100, 80xxx)
  if (code === 100 || (code >= 80000 && code < 81000)) {
    return {
      code: 'validation_error',
      category: 'validation',
      severity: 'medium',
      recoverable: true
    }
  }

  // Server errors (1, 2, 500+)
  if ([1, 2].includes(code) || code >= 500) {
    return {
      code: 'api_error',
      category: 'server',
      severity: 'medium',
      recoverable: true
    }
  }

  // Check message for common patterns
  if (errorMessage.toLowerCase().includes('token')) {
    return {
      code: 'token_expired',
      category: 'authentication',
      severity: 'high',
      recoverable: true
    }
  }

  if (errorMessage.toLowerCase().includes('payment')) {
    return {
      code: 'payment_required',
      category: 'business_logic',
      severity: 'high',
      recoverable: true
    }
  }

  if (errorMessage.toLowerCase().includes('policy') || errorMessage.toLowerCase().includes('violat')) {
    return {
      code: 'policy_violation',
      category: 'business_logic',
      severity: 'high',
      recoverable: true
    }
  }

  // Default: unknown API error
  return {
    code: 'api_error',
    category: 'server',
    severity: 'medium',
    recoverable: true
  }
}

/**
 * Determine if error should trigger immediate retry
 */
export function shouldRetry(classifiedError: ClassifiedError, retryCount: number): boolean {
  // Never retry non-recoverable errors
  if (!classifiedError.recoverable) {
    return false
  }

  // Don't retry validation or policy errors
  if (['validation', 'business_logic'].includes(classifiedError.category)) {
    return false
  }

  // Retry rate limit and server errors up to 3 times
  if (['rate_limit', 'server'].includes(classifiedError.category)) {
    return retryCount < 3
  }

  // Don't auto-retry authentication errors (need user intervention)
  return false
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, ...
  return Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 seconds
}

