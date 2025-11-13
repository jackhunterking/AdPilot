/**
 * Feature: Error Recovery Handler
 * Purpose: Classify errors and implement recovery strategies
 * References:
 *  - Meta Error Reference: https://developers.facebook.com/docs/marketing-api/error-reference
 */

import type { PublishError, PublishingStage } from '../types/publishing';
import { META_ERROR_CODES, isRecoverableError, isUserFixableError, isTerminalError } from '../config/publishing-config';
import { MetaAPIClientError } from './meta-api-client';

// ============================================================================
// TYPES
// ============================================================================

export type ErrorCategory = 'RECOVERABLE' | 'USER_FIXABLE' | 'TERMINAL';

export interface RecoveryStrategy {
  category: ErrorCategory;
  shouldRetry: boolean;
  suggestedAction: string;
  userMessage: string;
}

// ============================================================================
// ERROR RECOVERY HANDLER CLASS
// ============================================================================

export class ErrorRecoveryHandler {
  /**
   * Classify an error and determine recovery strategy
   */
  classifyError(error: Error | PublishError, stage: PublishingStage): RecoveryStrategy {
    // Handle Meta API errors
    if (error instanceof MetaAPIClientError) {
      return this.classifyMetaError(error);
    }

    // Handle PublishError
    if ('recoverable' in error && 'stage' in error) {
      return {
        category: error.recoverable ? 'RECOVERABLE' : 'TERMINAL',
        shouldRetry: error.recoverable,
        suggestedAction: error.suggestedAction || 'Please try again',
        userMessage: error.userMessage
      };
    }

    // Handle generic errors
    return this.classifyGenericError(error, stage);
  }

  /**
   * Classify Meta API error
   */
  private classifyMetaError(error: MetaAPIClientError): RecoveryStrategy {
    const code = error.code;

    // Recoverable errors
    if (isRecoverableError(code)) {
      return {
        category: 'RECOVERABLE',
        shouldRetry: true,
        suggestedAction: this.getRecoverableAction(code),
        userMessage: error.getUserFriendlyMessage()
      };
    }

    // User-fixable errors
    if (isUserFixableError(code)) {
      return {
        category: 'USER_FIXABLE',
        shouldRetry: false,
        suggestedAction: this.getUserFixableAction(code),
        userMessage: error.getUserFriendlyMessage()
      };
    }

    // Terminal errors
    if (isTerminalError(code)) {
      return {
        category: 'TERMINAL',
        shouldRetry: false,
        suggestedAction: this.getTerminalAction(code),
        userMessage: error.getUserFriendlyMessage()
      };
    }

    // Unknown error code - treat as recoverable with caution
    return {
      category: 'RECOVERABLE',
      shouldRetry: true,
      suggestedAction: 'Wait a moment and try again',
      userMessage: error.message
    };
  }

  /**
   * Classify generic error
   */
  private classifyGenericError(error: Error, stage: PublishingStage): RecoveryStrategy {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('timeout') || message.includes('network') || message.includes('fetch failed')) {
      return {
        category: 'RECOVERABLE',
        shouldRetry: true,
        suggestedAction: 'Check your internet connection and try again',
        userMessage: 'Network error occurred. Please check your connection and try again.'
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('missing')) {
      return {
        category: 'USER_FIXABLE',
        shouldRetry: false,
        suggestedAction: 'Fix the validation errors and try again',
        userMessage: error.message
      };
    }

    // Default: terminal error
    return {
      category: 'TERMINAL',
      shouldRetry: false,
      suggestedAction: 'Contact support if this persists',
      userMessage: error.message
    };
  }

  /**
   * Get recovery action for recoverable errors
   */
  private getRecoverableAction(code: number): string {
    switch (code) {
      case META_ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return 'Wait a few minutes before trying again';
      case META_ERROR_CODES.ACCOUNT_TEMPORARILY_UNAVAILABLE:
        return 'Wait a few minutes for Meta services to recover';
      default:
        return 'Try again in a moment';
    }
  }

  /**
   * Get recovery action for user-fixable errors
   */
  private getUserFixableAction(code: number): string {
    switch (code) {
      case META_ERROR_CODES.INVALID_ACCESS_TOKEN:
      case META_ERROR_CODES.SESSION_EXPIRED:
        return 'Reconnect your Facebook account';
      case META_ERROR_CODES.INVALID_PARAMETER:
        return 'Check your campaign setup and fix any validation errors';
      default:
        return 'Review and fix the error, then try again';
    }
  }

  /**
   * Get recovery action for terminal errors
   */
  private getTerminalAction(code: number): string {
    switch (code) {
      case META_ERROR_CODES.PERMISSION_DENIED:
        return 'Check your Facebook account permissions in Meta Business Manager';
      case META_ERROR_CODES.ACCOUNT_DISABLED:
        return 'Your Facebook account is disabled. Contact Facebook support';
      case META_ERROR_CODES.AD_ACCOUNT_DISABLED:
        return 'Your ad account is disabled. Check account status in Meta Business Manager';
      case META_ERROR_CODES.BUSINESS_ACCOUNT_ERROR:
        return 'Business account issue. Contact Meta Business support';
      default:
        return 'Contact support for assistance';
    }
  }

  /**
   * Create a PublishError from any error
   */
  createPublishError(
    error: Error,
    stage: import('../types/publishing').PublishingStage,
    customUserMessage?: string
  ): PublishError {
    const strategy = this.classifyError(error, stage);

    // Extract Meta error details if available
    let metaErrorCode: number | undefined;
    let metaErrorSubcode: number | undefined;
    let metaErrorUserTitle: string | undefined;
    let metaErrorUserMessage: string | undefined;

    if (error instanceof MetaAPIClientError) {
      metaErrorCode = error.code;
      metaErrorSubcode = error.error_subcode;
      metaErrorUserTitle = error.error_user_title;
      metaErrorUserMessage = error.error_user_msg;
    }

    return {
      code: metaErrorCode ? `META_${metaErrorCode}` : 'UNKNOWN',
      message: error.message,
      userMessage: customUserMessage || strategy.userMessage,
      recoverable: strategy.shouldRetry,
      suggestedAction: strategy.suggestedAction,
      metaErrorCode,
      metaErrorSubcode,
      metaErrorUserTitle,
      metaErrorUserMessage,
      stage,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an error recovery handler instance
 */
export function createErrorRecoveryHandler(): ErrorRecoveryHandler {
  return new ErrorRecoveryHandler();
}

/**
 * Classify an error
 */
export function classifyPublishError(error: Error, stage: import('../types/publishing').PublishingStage): RecoveryStrategy {
  const handler = new ErrorRecoveryHandler();
  return handler.classifyError(error, stage);
}

/**
 * Check if error is recoverable
 */
export function isErrorRecoverable(error: Error): boolean {
  const handler = new ErrorRecoveryHandler();
  const strategy = handler.classifyError(error, 'IDLE');
  return strategy.shouldRetry;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: Error): string {
  const handler = new ErrorRecoveryHandler();
  const strategy = handler.classifyError(error, 'IDLE');
  return strategy.userMessage;
}

