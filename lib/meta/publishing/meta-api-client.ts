/**
 * Feature: Meta Graph API Client
 * Purpose: Low-level Meta Graph API v24.0 client with retry, circuit breaker, and error handling
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Campaign Creation: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group#Creating
 *  - AdSet Creation: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign#Creating
 *  - Ad Creation: https://developers.facebook.com/docs/marketing-api/reference/adgroup#Creating
 *  - AdCreative Creation: https://developers.facebook.com/docs/marketing-api/reference/ad-creative#Creating
 */

import type { PublishLogger } from '../observability/publish-logger';
import {
  META_GRAPH_BASE_URL,
  RETRY_CONFIG,
  TIMEOUT_CONFIG,
  META_ERROR_CODES,
  isRecoverableError,
  isTerminalError
} from '../config/publishing-config';
import type { MetaAPIError, MetaCreatedObjectResponse } from '../types/publishing';

// ============================================================================
// TYPES
// ============================================================================

export interface APICallOptions {
  timeout?: number;
  retryable?: boolean;
  maxRetries?: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// ============================================================================
// META API CLIENT CLASS
// ============================================================================

export class MetaAPIClient {
  private token: string;
  private logger: PublishLogger;
  private circuitBreaker: CircuitBreakerState;

  constructor(token: string, logger: PublishLogger) {
    this.token = token;
    this.logger = logger;
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    };
  }

  /**
   * Create a campaign
   * POST /act_{ad_account_id}/campaigns
   */
  async createCampaign(
    adAccountId: string,
    payload: Record<string, unknown>
  ): Promise<MetaCreatedObjectResponse> {
    const normalizedId = this.normalizeAdAccountId(adAccountId);
    const path = `act_${normalizedId}/campaigns`;

    return await this.post<MetaCreatedObjectResponse>(path, payload);
  }

  /**
   * Create an ad set
   * POST /act_{ad_account_id}/adsets
   */
  async createAdSet(
    adAccountId: string,
    payload: Record<string, unknown>
  ): Promise<MetaCreatedObjectResponse> {
    const normalizedId = this.normalizeAdAccountId(adAccountId);
    const path = `act_${normalizedId}/adsets`;

    return await this.post<MetaCreatedObjectResponse>(path, payload);
  }

  /**
   * Create an ad creative
   * POST /act_{ad_account_id}/adcreatives
   */
  async createAdCreative(
    adAccountId: string,
    payload: Record<string, unknown>
  ): Promise<MetaCreatedObjectResponse> {
    const normalizedId = this.normalizeAdAccountId(adAccountId);
    const path = `act_${normalizedId}/adcreatives`;

    return await this.post<MetaCreatedObjectResponse>(path, payload);
  }

  /**
   * Create an ad
   * POST /act_{ad_account_id}/ads
   */
  async createAd(
    adAccountId: string,
    payload: Record<string, unknown>
  ): Promise<MetaCreatedObjectResponse> {
    const normalizedId = this.normalizeAdAccountId(adAccountId);
    const path = `act_${normalizedId}/ads`;

    return await this.post<MetaCreatedObjectResponse>(path, payload);
  }

  /**
   * Update object status
   * POST /{object_id}
   */
  async updateStatus(
    objectId: string,
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  ): Promise<MetaCreatedObjectResponse> {
    return await this.post<MetaCreatedObjectResponse>(objectId, { status });
  }

  /**
   * Get object details
   * GET /{object_id}
   */
  async getObject<T = unknown>(
    objectId: string,
    fields?: string[]
  ): Promise<T> {
    const path = fields ? `${objectId}?fields=${fields.join(',')}` : objectId;
    return await this.get<T>(path);
  }

  /**
   * Delete object
   * DELETE /{object_id}
   */
  async deleteObject(objectId: string): Promise<{ success: boolean }> {
    return await this.delete(objectId);
  }

  // ============================================================================
  // HTTP METHODS
  // ============================================================================

  /**
   * POST request
   */
  private async post<T>(
    path: string,
    payload: Record<string, unknown>,
    options: APICallOptions = {}
  ): Promise<T> {
    return await this.makeRequest<T>('POST', path, payload, options);
  }

  /**
   * GET request
   */
  private async get<T>(
    path: string,
    options: APICallOptions = {}
  ): Promise<T> {
    return await this.makeRequest<T>('GET', path, undefined, options);
  }

  /**
   * DELETE request
   */
  private async delete(
    path: string,
    options: APICallOptions = {}
  ): Promise<{ success: boolean }> {
    return await this.makeRequest<{ success: boolean }>('DELETE', path, undefined, options);
  }

  /**
   * Core HTTP request method with retry and circuit breaker
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    payload?: Record<string, unknown>,
    options: APICallOptions = {}
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreaker.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceFailure < 60000) { // 1 minute
        throw new Error('Circuit breaker is OPEN. Too many recent failures. Please wait before retrying.');
      }
      // Try half-open
      this.circuitBreaker.state = 'HALF_OPEN';
    }

    const maxRetries = options.maxRetries ?? (options.retryable !== false ? RETRY_CONFIG.maxAttempts : 1);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.makeRequestOnce<T>(method, path, payload, options.timeout);

        // Success - reset circuit breaker
        if (this.circuitBreaker.state === 'HALF_OPEN' || this.circuitBreaker.failures > 0) {
          this.circuitBreaker.failures = 0;
          this.circuitBreaker.state = 'CLOSED';
        }

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Handle circuit breaker
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailureTime = Date.now();

        if (this.circuitBreaker.failures >= 5) {
          this.circuitBreaker.state = 'OPEN';
          this.logger.logCritical('Circuit breaker opened due to repeated failures', lastError, {
            failures: this.circuitBreaker.failures
          });
        }

        // Check if we should retry
        const shouldRetry = this.shouldRetry(lastError, attempt, maxRetries);

        if (!shouldRetry) {
          throw lastError;
        }

        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt);

        this.logger.logRetry(`${method} ${path}`, attempt, maxRetries, delay, lastError.message);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Single HTTP request attempt
   */
  private async makeRequestOnce<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    payload?: Record<string, unknown>,
    timeout?: number
  ): Promise<T> {
    const startTime = Date.now();
    const url = `${META_GRAPH_BASE_URL}/${path}`;

    this.logger.logAPICall(url, method, payload ? { payloadKeys: Object.keys(payload) } : undefined);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutMs = timeout || TIMEOUT_CONFIG.apiCall;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Build request options
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        signal: controller.signal
      };

      // Add body for POST requests
      if (method === 'POST' && payload) {
        options.body = this.encodePayload(payload);
        options.headers = {
          ...options.headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        };
      }

      // Make request
      const response = await fetch(url, options);

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseText = await response.text();

      // Log response
      this.logger.logAPIResponse(url, response.status, duration);

      // Parse JSON
      let responseJson: unknown;
      try {
        responseJson = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      // Handle error responses
      if (!response.ok) {
        throw this.parseError(responseJson, response.status);
      }

      return responseJson as T;

    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }

      throw error;
    }
  }

  /**
   * Encode payload as URL-encoded form data (Meta's preferred format)
   */
  private encodePayload(payload: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();

    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return; // Skip null/undefined
      }

      if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'bigint') {
        params.append(key, String(value));
        return;
      }

      if (typeof value === 'string') {
        params.append(key, value);
        return;
      }

      // Objects and arrays as JSON
      params.append(key, JSON.stringify(value));
    });

    return params;
  }

  /**
   * Parse Meta API error response
   */
  private parseError(json: unknown, statusCode: number): Error {
    if (!json || typeof json !== 'object') {
      return new Error(`HTTP ${statusCode}: Unknown error`);
    }

    const obj = json as { error?: unknown };
    const error = obj.error;

    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;

      const code = typeof err.code === 'number' ? err.code : statusCode;
      const message = typeof err.message === 'string' ? err.message : 'Unknown Meta API error';
      const subcode = typeof err.error_subcode === 'number' ? err.error_subcode : undefined;
      const userTitle = typeof err.error_user_title === 'string' ? err.error_user_title : undefined;
      const userMsg = typeof err.error_user_msg === 'string' ? err.error_user_msg : undefined;
      const fbtraceId = typeof err.fbtrace_id === 'string' ? err.fbtrace_id : undefined;

      return new MetaAPIClientError(message, code, subcode, userTitle, userMsg, fbtraceId);
    }

    return new Error(`HTTP ${statusCode}: ${JSON.stringify(json)}`);
  }

  /**
   * Determine if error should be retried
   */
  private shouldRetry(error: Error, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    // Terminal errors should not be retried
    if (error instanceof MetaAPIClientError && isTerminalError(error.code)) {
      return false;
    }

    // Recoverable errors should be retried
    if (error instanceof MetaAPIClientError && isRecoverableError(error.code)) {
      return true;
    }

    // Network errors should be retried
    if (error.message.includes('timeout') || 
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNRESET')) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalize ad account ID
   */
  private normalizeAdAccountId(id: string): string {
    return id.replace(/^act_/, '');
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    };
    this.logger.logWarning('Circuit breaker manually reset');
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class MetaAPIClientError extends Error implements MetaAPIError {
  public readonly type: string = 'MetaAPIError';

  constructor(
    message: string,
    public readonly code: number,
    public readonly error_subcode?: number,
    public readonly error_user_title?: string,
    public readonly error_user_msg?: string,
    public readonly fbtrace_id?: string,
    public readonly is_transient?: boolean
  ) {
    super(message);
    this.name = 'MetaAPIClientError';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    if (this.error_user_msg) {
      return this.error_user_msg;
    }

    switch (this.code) {
      case META_ERROR_CODES.INVALID_ACCESS_TOKEN:
      case META_ERROR_CODES.SESSION_EXPIRED:
        return 'Your Facebook connection has expired. Please reconnect your account.';

      case META_ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return 'Too many requests. Please wait a moment and try again.';

      case META_ERROR_CODES.ACCOUNT_TEMPORARILY_UNAVAILABLE:
        return 'Facebook service temporarily unavailable. Please try again shortly.';

      case META_ERROR_CODES.PERMISSION_DENIED:
        return 'Permission denied. Please check your Facebook account permissions.';

      case META_ERROR_CODES.AD_ACCOUNT_DISABLED:
        return 'Your ad account is disabled. Please check your account status in Meta Business Manager.';

      case META_ERROR_CODES.ACCOUNT_DISABLED:
        return 'Your Facebook account is disabled. Please contact Facebook support.';

      case META_ERROR_CODES.INVALID_PARAMETER:
        return `Invalid request parameter. ${this.message}`;

      default:
        return this.message;
    }
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    return isRecoverableError(this.code);
  }

  /**
   * Check if error is terminal
   */
  isTerminal(): boolean {
    return isTerminalError(this.code);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a Meta API client instance
 */
export function createMetaAPIClient(token: string, logger: PublishLogger): MetaAPIClient {
  return new MetaAPIClient(token, logger);
}

/**
 * Validate ad account ID format
 */
export function validateAdAccountId(id: string): boolean {
  const normalized = id.replace(/^act_/, '');
  return /^\d+$/.test(normalized);
}

/**
 * Format ad account ID for display
 */
export function formatAdAccountForDisplay(id: string): string {
  const normalized = id.replace(/^act_/, '');
  return `act_${normalized}`;
}

