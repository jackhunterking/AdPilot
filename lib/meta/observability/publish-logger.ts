/**
 * Feature: Publishing Observability & Logging
 * Purpose: Structured logging system for Meta ad publishing pipeline with correlation tracking
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Existing logger: lib/meta/logger.ts
 */

import { metaLogger } from '../logger';
import { randomUUID } from 'crypto';
import type { PublishingStage, PublishError, MetaAPIError } from '../types/publishing';

// ============================================================================
// LOGGER CLASS
// ============================================================================

export class PublishLogger {
  private correlationId: string;
  private campaignId: string;
  private startTime: number;
  private stageTimers: Map<string, number>;

  constructor(campaignId: string, correlationId?: string) {
    this.campaignId = campaignId;
    this.correlationId = correlationId || randomUUID();
    this.startTime = Date.now();
    this.stageTimers = new Map();
  }

  /**
   * Get the correlation ID for this publish session
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Get elapsed time since logger creation
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Sanitize sensitive data from context
   */
  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };

    // Patterns to redact
    const sensitiveKeys = ['token', 'access_token', 'password', 'secret', 'key', 'auth'];

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive terms
      if (sensitiveKeys.some(term => lowerKey.includes(term))) {
        const value = sanitized[key];
        if (typeof value === 'string') {
          // Redact but show first/last few characters
          if (value.length > 8) {
            sanitized[key] = `${value.slice(0, 4)}...${value.slice(-4)}`;
          } else {
            sanitized[key] = '***REDACTED***';
          }
        } else {
          sanitized[key] = '***REDACTED***';
        }
      }

      // Recursively sanitize nested objects
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
        sanitized[key] = this.sanitize(sanitized[key] as Record<string, unknown>);
      }
    }

    return sanitized;
  }

  /**
   * Build common context for all log entries
   */
  private buildContext(additionalContext?: Record<string, unknown>): Record<string, unknown> {
    return {
      correlationId: this.correlationId,
      campaignId: this.campaignId,
      elapsedTime_ms: this.getElapsedTime(),
      timestamp: new Date().toISOString(),
      ...(additionalContext ? this.sanitize(additionalContext) : {})
    };
  }

  /**
   * Log the start of a publishing stage
   */
  logStageStart(stage: PublishingStage, context?: Record<string, unknown>): void {
    this.stageTimers.set(stage, Date.now());

    metaLogger.info('PublishFlow', `Stage ${stage} started`, this.buildContext({
      stage,
      operation: 'stage_start',
      ...context
    }));
  }

  /**
   * Log the completion of a publishing stage
   */
  logStageComplete(stage: PublishingStage, context?: Record<string, unknown>): void {
    const startTime = this.stageTimers.get(stage);
    const duration = startTime ? Date.now() - startTime : undefined;

    metaLogger.info('PublishFlow', `Stage ${stage} completed`, this.buildContext({
      stage,
      operation: 'stage_complete',
      duration_ms: duration,
      ...context
    }));

    this.stageTimers.delete(stage);
  }

  /**
   * Log an API call to Meta
   */
  logAPICall(endpoint: string, method: string, context?: Record<string, unknown>): void {
    metaLogger.info('PublishFlow', `Meta API call: ${method} ${endpoint}`, this.buildContext({
      operation: 'api_call',
      endpoint,
      method,
      ...context
    }));
  }

  /**
   * Log an API response from Meta
   */
  logAPIResponse(endpoint: string, status: number, duration: number, context?: Record<string, unknown>): void {
    const logLevel = status >= 400 ? 'warn' : 'info';

    metaLogger[logLevel]('PublishFlow', `Meta API response: ${status} from ${endpoint}`, this.buildContext({
      operation: 'api_response',
      endpoint,
      status,
      duration_ms: duration,
      ...context
    }));
  }

  /**
   * Log a retry attempt
   */
  logRetry(operation: string, attempt: number, maxAttempts: number, delay: number, reason?: string): void {
    metaLogger.warn('PublishFlow', `Retrying ${operation} (attempt ${attempt}/${maxAttempts})`, this.buildContext({
      operation: 'retry',
      retryOperation: operation,
      attempt,
      maxAttempts,
      delay_ms: delay,
      reason
    }));
  }

  /**
   * Log a validation failure
   */
  logValidationFailure(field: string, error: string, context?: Record<string, unknown>): void {
    metaLogger.warn('PublishFlow', `Validation failed for ${field}: ${error}`, this.buildContext({
      operation: 'validation_failure',
      field,
      validationError: error,
      ...context
    }));
  }

  /**
   * Log a warning
   */
  logWarning(message: string, context?: Record<string, unknown>): void {
    metaLogger.warn('PublishFlow', message, this.buildContext({
      operation: 'warning',
      ...context
    }));
  }

  /**
   * Log an error
   */
  logError(error: Error | PublishError | MetaAPIError, stage: PublishingStage, context?: Record<string, unknown>): void {
    const errorContext: Record<string, unknown> = {
      operation: 'error',
      stage,
      errorName: error instanceof Error ? error.name : 'PublishError',
      errorMessage: error.message,
      ...context
    };

    // Add Meta-specific error details if available
    if ('code' in error && typeof error.code === 'number') {
      errorContext.metaErrorCode = error.code;
    }

    if ('error_subcode' in error && typeof error.error_subcode === 'number') {
      errorContext.metaErrorSubcode = error.error_subcode;
    }

    if ('fbtrace_id' in error && typeof error.fbtrace_id === 'string') {
      errorContext.fbtraceId = error.fbtrace_id;
    }

    // Add PublishError-specific details
    if ('recoverable' in error) {
      errorContext.recoverable = error.recoverable;
      errorContext.suggestedAction = 'suggestedAction' in error ? error.suggestedAction : undefined;
    }

    // Convert to Error if needed for metaLogger
    const errorForLogging = error instanceof Error ? error : new Error(error.message);
    metaLogger.error('PublishFlow', error.message, errorForLogging, this.buildContext(errorContext));
  }

  /**
   * Log a critical error (system-level failure)
   */
  logCritical(message: string, error?: Error, context?: Record<string, unknown>): void {
    metaLogger.error('PublishFlow', `CRITICAL: ${message}`, error || new Error(message), this.buildContext({
      operation: 'critical_error',
      critical: true,
      ...context
    }));
  }

  /**
   * Log progress update
   */
  logProgress(stage: PublishingStage, progress: number, message: string, context?: Record<string, unknown>): void {
    metaLogger.info('PublishFlow', `Progress: ${progress}% - ${message}`, this.buildContext({
      operation: 'progress',
      stage,
      progress,
      progressMessage: message,
      ...context
    }));
  }

  /**
   * Log successful completion of entire publish flow
   */
  logPublishSuccess(metaCampaignId: string, metaAdSetId: string, metaAdIds: string[]): void {
    metaLogger.info('PublishFlow', 'Campaign published successfully', this.buildContext({
      operation: 'publish_success',
      totalDuration_ms: this.getElapsedTime(),
      metaCampaignId,
      metaAdSetId,
      metaAdIds,
      adCount: metaAdIds.length
    }));
  }

  /**
   * Log failed publish with summary
   */
  logPublishFailure(stage: PublishingStage, error: string, context?: Record<string, unknown>): void {
    metaLogger.error('PublishFlow', 'Campaign publish failed', new Error(error), this.buildContext({
      operation: 'publish_failure',
      totalDuration_ms: this.getElapsedTime(),
      failedStage: stage,
      failureReason: error,
      ...context
    }));
  }

  /**
   * Log rollback initiation
   */
  logRollbackStart(reason: string, objectsToDelete: Record<string, unknown>): void {
    metaLogger.warn('PublishFlow', `Starting rollback: ${reason}`, this.buildContext({
      operation: 'rollback_start',
      reason,
      objectsToDelete: this.sanitize(objectsToDelete)
    }));
  }

  /**
   * Log rollback completion
   */
  logRollbackComplete(deletedObjects: Record<string, unknown>): void {
    metaLogger.info('PublishFlow', 'Rollback completed', this.buildContext({
      operation: 'rollback_complete',
      deletedObjects: this.sanitize(deletedObjects)
    }));
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(metrics: Record<string, number>): void {
    metaLogger.info('PublishFlow', 'Performance metrics', this.buildContext({
      operation: 'performance_metrics',
      metrics
    }));
  }

  /**
   * Create a child logger for a sub-operation
   */
  createChildLogger(operation: string): PublishLogger {
    const childLogger = new PublishLogger(this.campaignId, this.correlationId);
    childLogger.startTime = this.startTime; // Share the same start time

    metaLogger.info('PublishFlow', `Creating child logger for ${operation}`, this.buildContext({
      operation: 'child_logger_created',
      childOperation: operation
    }));

    return childLogger;
  }
}

// ============================================================================
// SINGLETON LOGGER REGISTRY (Optional - for tracking multiple publishes)
// ============================================================================

class PublishLoggerRegistry {
  private loggers: Map<string, PublishLogger> = new Map();

  register(campaignId: string, logger: PublishLogger): void {
    this.loggers.set(campaignId, logger);
  }

  get(campaignId: string): PublishLogger | undefined {
    return this.loggers.get(campaignId);
  }

  remove(campaignId: string): void {
    this.loggers.delete(campaignId);
  }

  clear(): void {
    this.loggers.clear();
  }

  getActiveLoggers(): PublishLogger[] {
    return Array.from(this.loggers.values());
  }
}

export const publishLoggerRegistry = new PublishLoggerRegistry();

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Create a new publish logger and optionally register it
 */
export function createPublishLogger(campaignId: string, register = false): PublishLogger {
  const logger = new PublishLogger(campaignId);

  if (register) {
    publishLoggerRegistry.register(campaignId, logger);
  }

  return logger;
}

