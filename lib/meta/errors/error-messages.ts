/**
 * Feature: Error Messages
 * Purpose: User-friendly error messages and suggested actions
 * References:
 *  - Meta Marketing API: https://developers.facebook.com/docs/marketing-api
 */

import type { PublishErrorCode } from '../../types/workspace'

interface ErrorMessageConfig {
  title: string
  userMessage: string
  suggestedAction: string
  helpLink?: string
}

/**
 * Get user-friendly error message and suggested action
 */
export function getErrorMessage(code: PublishErrorCode, details?: Record<string, unknown>): ErrorMessageConfig {
  const messages: Record<PublishErrorCode, ErrorMessageConfig> = {
    validation_error: {
      title: 'Validation Error',
      userMessage: 'Some required fields are missing or invalid. Please review your ad details and try again.',
      suggestedAction: 'Edit your ad to fix validation issues, then republish.',
      helpLink: 'https://www.facebook.com/business/help/402876963841254'
    },
    
    policy_violation: {
      title: 'Policy Violation',
      userMessage: 'Your ad doesn\'t meet Meta\'s advertising policies. This could be due to prohibited content, restricted products, or other policy issues.',
      suggestedAction: 'Review Meta\'s advertising policies, edit your ad to comply, then resubmit for review.',
      helpLink: 'https://www.facebook.com/policies/ads/'
    },
    
    payment_required: {
      title: 'Payment Method Required',
      userMessage: 'A valid payment method is required to publish ads. Please add a payment method to your ad account.',
      suggestedAction: 'Go to Meta Business Settings → Payments → Add a payment method, then retry publishing.',
      helpLink: 'https://www.facebook.com/business/help/448633038995435'
    },
    
    token_expired: {
      title: 'Connection Expired',
      userMessage: 'Your Facebook connection has expired or been revoked. Please reconnect your account.',
      suggestedAction: 'Click "Reconnect Meta" in settings to authorize access again, then retry publishing.',
      helpLink: undefined
    },
    
    api_error: {
      title: 'API Error',
      userMessage: 'Meta\'s advertising API encountered an error. This is usually temporary.',
      suggestedAction: 'Wait a few minutes and try again. If the problem persists, contact support.',
      helpLink: 'https://developers.facebook.com/support/'
    },
    
    network_error: {
      title: 'Network Error',
      userMessage: 'Unable to connect to Meta\'s servers. Please check your internet connection.',
      suggestedAction: 'Check your internet connection and try again. If you\'re behind a firewall, ensure Meta APIs are accessible.',
      helpLink: undefined
    },
    
    unknown_error: {
      title: 'Unknown Error',
      userMessage: 'An unexpected error occurred while publishing your ad.',
      suggestedAction: 'Please try again. If the problem persists, contact support with the error details.',
      helpLink: undefined
    }
  }

  return messages[code] || messages.unknown_error
}

/**
 * Format error for display
 */
export function formatErrorForUser(
  code: PublishErrorCode,
  technicalMessage: string,
  details?: Record<string, unknown>
): {
  code: PublishErrorCode
  message: string
  userMessage: string
  suggestedAction: string
  helpLink?: string
  details?: Record<string, unknown>
} {
  const config = getErrorMessage(code, details)
  
  return {
    code,
    message: technicalMessage,
    userMessage: config.userMessage,
    suggestedAction: config.suggestedAction,
    helpLink: config.helpLink,
    details
  }
}

/**
 * Get help article URL based on error code
 */
export function getHelpUrl(code: PublishErrorCode): string | undefined {
  const config = getErrorMessage(code)
  return config.helpLink
}

