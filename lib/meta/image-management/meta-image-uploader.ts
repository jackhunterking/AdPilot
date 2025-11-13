/**
 * Feature: Meta AdImage Upload Service
 * Purpose: Upload images to Meta Marketing API v24.0 AdImage endpoint
 * References:
 *  - Meta AdImage API: https://developers.facebook.com/docs/marketing-api/reference/ad-image
 *  - Meta API v24.0: https://developers.facebook.com/docs/graph-api/changelog/version24.0
 */

import type { PublishLogger } from '../observability/publish-logger';
import { 
  META_GRAPH_BASE_URL, 
  RETRY_CONFIG,
  TIMEOUT_CONFIG,
  META_ERROR_CODES,
  isRecoverableError
} from '../config/publishing-config';
import type { MetaImageUploadResult, MetaAPIError } from '../types/publishing';

// ============================================================================
// META IMAGE UPLOADER CLASS
// ============================================================================

export class MetaImageUploader {
  private token: string;
  private adAccountId: string;
  private logger: PublishLogger;
  private uploadCache: Map<string, MetaImageUploadResult>;

  constructor(token: string, adAccountId: string, logger: PublishLogger) {
    this.token = token;
    this.adAccountId = this.normalizeAdAccountId(adAccountId);
    this.logger = logger;
    this.uploadCache = new Map();
  }

  /**
   * Upload an image to Meta AdImage API
   * @param buffer - Image buffer (must be processed/optimized)
   * @param filename - Filename for the upload
   * @param imageHash - MD5 hash for deduplication
   * @returns Upload result with Meta image hash and URL
   */
  async upload(
    buffer: Buffer,
    filename: string,
    imageHash: string
  ): Promise<MetaImageUploadResult> {
    // Check cache first to avoid re-uploading
    if (this.uploadCache.has(imageHash)) {
      this.logger.logStageStart('UPLOADING_IMAGES', {
        operation: 'upload',
        cached: true,
        filename
      });
      return this.uploadCache.get(imageHash)!;
    }

    // Upload with retry logic
    const result = await this.uploadWithRetry(buffer, filename, imageHash);

    // Cache the result
    this.uploadCache.set(imageHash, result);

    return result;
  }

  /**
   * Upload with automatic retry on failures
   */
  private async uploadWithRetry(
    buffer: Buffer,
    filename: string,
    imageHash: string
  ): Promise<MetaImageUploadResult> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < RETRY_CONFIG.maxAttempts) {
      attempt++;

      try {
        return await this.uploadOnce(buffer, filename);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if error is recoverable
        const isRecoverable = this.isRecoverableError(lastError);

        this.logger.logError(lastError, 'UPLOADING_IMAGES', {
          operation: 'upload',
          attempt,
          maxAttempts: RETRY_CONFIG.maxAttempts,
          recoverable: isRecoverable,
          filename
        });

        // If not recoverable or last attempt, throw immediately
        if (!isRecoverable || attempt >= RETRY_CONFIG.maxAttempts) {
          throw lastError;
        }

        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt);

        this.logger.logRetry('image_upload', attempt, RETRY_CONFIG.maxAttempts, delay, lastError.message);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Upload failed after retries');
  }

  /**
   * Single upload attempt to Meta API
   */
  private async uploadOnce(buffer: Buffer, filename: string): Promise<MetaImageUploadResult> {
    const startTime = Date.now();

    // Create form data using native FormData
    const form = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' });
    form.append('filename', blob, filename);

    // Build API URL
    const url = `${META_GRAPH_BASE_URL}/act_${this.adAccountId}/adimages`;

    this.logger.logAPICall(url, 'POST', {
      filename,
      size: buffer.length
    });

    // Upload to Meta
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_CONFIG.imageUpload);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
          // Don't set Content-Type - let browser set it with boundary
        },
        body: form,
        signal: controller.signal
      });

      clearTimeout(timeout);

      const duration = Date.now() - startTime;
      const responseText = await response.text();

      // Log response
      this.logger.logAPIResponse(url, response.status, duration, {
        filename
      });

      // Parse response
      let responseJson: unknown;
      try {
        responseJson = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(`Invalid JSON response from Meta API: ${responseText.substring(0, 200)}`);
      }

      // Handle error responses
      if (!response.ok) {
        throw this.parseMetaError(responseJson, response.status);
      }

      // Parse successful response
      const result = this.parseUploadResponse(responseJson, filename);

      return result;

    } catch (error) {
      clearTimeout(timeout);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MetaImageUploadError(
          `Upload timeout after ${TIMEOUT_CONFIG.imageUpload}ms`,
          'UPLOAD_TIMEOUT'
        );
      }

      throw error;
    }
  }

  /**
   * Parse Meta API upload response
   */
  private parseUploadResponse(json: unknown, filename: string): MetaImageUploadResult {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid upload response structure');
    }

    const obj = json as Record<string, unknown>;

    // Meta returns: { images: { [filename]: { hash, url, width, height } } }
    const images = obj.images as Record<string, unknown> | undefined;

    if (!images || typeof images !== 'object') {
      throw new Error('Missing images in response');
    }

    const imageData = images[filename] as Record<string, unknown> | undefined;

    if (!imageData) {
      // Sometimes Meta returns the data directly without filename key
      // Try getting the first key
      const firstKey = Object.keys(images)[0];
      if (firstKey) {
        const data = images[firstKey] as Record<string, unknown>;
        return this.extractImageData(data);
      }

      throw new Error(`Image data not found for ${filename} in response`);
    }

    return this.extractImageData(imageData);
  }

  /**
   * Extract image data from Meta response
   */
  private extractImageData(data: Record<string, unknown>): MetaImageUploadResult {
    return {
      hash: String(data.hash || ''),
      url: String(data.url || ''),
      width: Number(data.width || 0),
      height: Number(data.height || 0),
      uploadedAt: new Date().toISOString(),
      fileSize: 0, // Meta doesn't return file size
      format: 'jpg'
    };
  }

  /**
   * Parse Meta API error response
   */
  private parseMetaError(json: unknown, statusCode: number): Error {
    if (!json || typeof json !== 'object') {
      return new MetaImageUploadError(
        `HTTP ${statusCode}: Unknown error`,
        'UNKNOWN_ERROR',
        statusCode
      );
    }

    const obj = json as Record<string, unknown>;
    const error = obj.error as Record<string, unknown> | undefined;

    if (error) {
      const code = error.code as number || statusCode;
      const message = error.message as string || 'Unknown Meta API error';
      const subcode = error.error_subcode as number | undefined;
      const userTitle = error.error_user_title as string | undefined;
      const userMsg = error.error_user_msg as string | undefined;
      const fbtraceId = error.fbtrace_id as string | undefined;

      return new MetaAPIImageError(
        message,
        code,
        subcode,
        userTitle,
        userMsg,
        fbtraceId
      );
    }

    return new MetaImageUploadError(
      `HTTP ${statusCode}: ${JSON.stringify(json)}`,
      'API_ERROR',
      statusCode
    );
  }

  /**
   * Check if error is recoverable (should retry)
   */
  private isRecoverableError(error: Error): boolean {
    // Timeout errors are recoverable
    if (error instanceof MetaImageUploadError && error.code === 'UPLOAD_TIMEOUT') {
      return true;
    }

    // Meta API errors
    if (error instanceof MetaAPIImageError) {
      return isRecoverableError(error.errorCode);
    }

    // Network errors are recoverable
    if (error.message.includes('fetch failed') || 
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')) {
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
   * Normalize ad account ID (remove act_ prefix if present)
   */
  private normalizeAdAccountId(id: string): string {
    return id.replace(/^act_/, '');
  }

  /**
   * Clear upload cache
   */
  clearCache(): void {
    this.uploadCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.uploadCache.size;
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class MetaImageUploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'MetaImageUploadError';
  }
}

export class MetaAPIImageError extends Error {
  constructor(
    message: string,
    public readonly errorCode: number,
    public readonly errorSubcode?: number,
    public readonly userTitle?: string,
    public readonly userMessage?: string,
    public readonly fbtraceId?: string
  ) {
    super(message);
    this.name = 'MetaAPIImageError';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    if (this.userMessage) {
      return this.userMessage;
    }

    // Map common error codes to friendly messages
    switch (this.errorCode) {
      case META_ERROR_CODES.INVALID_ACCESS_TOKEN:
      case META_ERROR_CODES.SESSION_EXPIRED:
        return 'Your Facebook connection has expired. Please reconnect your account.';

      case META_ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return 'Upload rate limit exceeded. Please wait a moment and try again.';

      case META_ERROR_CODES.ACCOUNT_TEMPORARILY_UNAVAILABLE:
        return 'Facebook service temporarily unavailable. Please try again in a few minutes.';

      case META_ERROR_CODES.PERMISSION_DENIED:
        return 'Permission denied. Please ensure your Facebook account has the necessary permissions.';

      case META_ERROR_CODES.AD_ACCOUNT_DISABLED:
        return 'Your Facebook ad account is disabled. Please check your account status.';

      default:
        return this.message;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a Meta image uploader instance
 */
export function createMetaImageUploader(
  token: string,
  adAccountId: string,
  logger: PublishLogger
): MetaImageUploader {
  return new MetaImageUploader(token, adAccountId, logger);
}

/**
 * Validate ad account ID format
 */
export function isValidAdAccountId(id: string): boolean {
  // Can be "123456" or "act_123456"
  const normalized = id.replace(/^act_/, '');
  return /^\d+$/.test(normalized);
}

/**
 * Format ad account ID for display
 */
export function formatAdAccountId(id: string): string {
  const normalized = id.replace(/^act_/, '');
  return `act_${normalized}`;
}

