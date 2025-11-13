/**
 * Feature: Image Fetcher for Meta Ad Publishing
 * Purpose: Fetch images from Supabase Storage with timeout and error handling
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 *  - Supabase Storage: https://supabase.com/docs/reference/javascript/storage-from-download
 */

import type { PublishLogger } from '../observability/publish-logger';
import { IMAGE_REQUIREMENTS, TIMEOUT_CONFIG } from '../config/publishing-config';
import type { FetchImageResult } from '../types/publishing';

// ============================================================================
// IMAGE FETCHER CLASS
// ============================================================================

export class ImageFetcher {
  private logger: PublishLogger;

  constructor(logger: PublishLogger) {
    this.logger = logger;
  }

  /**
   * Fetch an image from a URL (typically Supabase Storage)
   */
  async fetchImage(url: string): Promise<FetchImageResult> {
    this.logger.logStageStart('UPLOADING_IMAGES', { 
      operation: 'fetch', 
      url: this.sanitizeUrl(url)
    });

    const startTime = Date.now();

    // Validate URL format
    if (!this.isValidUrl(url)) {
      const error = new Error('Invalid image URL format');
      this.logger.logError(error, 'UPLOADING_IMAGES', { url: this.sanitizeUrl(url) });
      throw error;
    }

    // Check if it's a Supabase URL (recommended but not required)
    const isSupabase = this.isSupabaseUrl(url);
    if (!isSupabase) {
      this.logger.logWarning('Non-Supabase URL detected, proceeding with caution', {
        url: this.sanitizeUrl(url)
      });
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      this.logger.logWarning('Image fetch timeout triggered', {
        url: this.sanitizeUrl(url),
        timeout_ms: TIMEOUT_CONFIG.imageDownload
      });
    }, TIMEOUT_CONFIG.imageDownload);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow', // Follow up to default redirects (20)
        headers: {
          'User-Agent': 'AdPilot/1.0',
          'Accept': 'image/*'
        }
      });

      clearTimeout(timeout);

      // Check response status
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Verify content type is an image
      const contentType = response.headers.get('content-type');
      if (!contentType || !this.isImageContentType(contentType)) {
        throw new Error(`Invalid content type: ${contentType || 'unknown'}. Expected image/*`);
      }

      // Get content length (may not always be available)
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength, 10) : 0;

      // Check size before downloading full content
      if (size > IMAGE_REQUIREMENTS.maxFileSize) {
        throw new Error(
          `Image too large: ${this.formatBytes(size)} (max ${this.formatBytes(IMAGE_REQUIREMENTS.maxFileSize)})`
        );
      }

      // Download the image buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Verify actual size after download
      if (buffer.length > IMAGE_REQUIREMENTS.maxFileSize) {
        throw new Error(
          `Downloaded image too large: ${this.formatBytes(buffer.length)} ` +
          `(max ${this.formatBytes(IMAGE_REQUIREMENTS.maxFileSize)})`
        );
      }

      // Check for minimum size (likely corrupt if too small)
      if (buffer.length < 100) {
        throw new Error('Image file too small, likely corrupt or invalid');
      }

      const duration = Date.now() - startTime;
      this.logger.logStageComplete('UPLOADING_IMAGES', {
        operation: 'fetch',
        size: buffer.length,
        duration_ms: duration,
        contentType
      });

      return {
        buffer,
        contentType: contentType || 'image/jpeg',
        size: buffer.length,
        url
      };

    } catch (error) {
      clearTimeout(timeout);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const timeoutError = new Error(
            `Image download timeout after ${TIMEOUT_CONFIG.imageDownload}ms`
          );
          this.logger.logError(timeoutError, 'UPLOADING_IMAGES', {
            url: this.sanitizeUrl(url),
            timeout_ms: TIMEOUT_CONFIG.imageDownload
          });
          throw timeoutError;
        }

        // Log and re-throw
        this.logger.logError(error, 'UPLOADING_IMAGES', {
          url: this.sanitizeUrl(url),
          duration_ms: Date.now() - startTime
        });
        throw error;
      }

      // Unknown error type
      const unknownError = new Error('Unknown error fetching image');
      this.logger.logError(unknownError, 'UPLOADING_IMAGES', {
        url: this.sanitizeUrl(url)
      });
      throw unknownError;
    }
  }

  /**
   * Batch fetch multiple images
   */
  async fetchImages(urls: string[]): Promise<Map<string, FetchImageResult>> {
    this.logger.logStageStart('UPLOADING_IMAGES', {
      operation: 'batch_fetch',
      count: urls.length
    });

    const results = new Map<string, FetchImageResult>();
    const errors: Array<{ url: string; error: Error }> = [];

    // Fetch images sequentially to avoid overwhelming the server
    // (parallel fetching could be added later if needed)
    for (const url of urls) {
      try {
        const result = await this.fetchImage(url);
        results.set(url, result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        errors.push({ url, error: err });
        this.logger.logWarning(`Failed to fetch image: ${url}`, {
          error: err.message
        });
      }
    }

    // If all failed, throw error
    if (results.size === 0 && errors.length > 0) {
      const firstError = errors[0];
      const error = new Error(
        `All ${errors.length} image(s) failed to fetch. First error: ${firstError ? firstError.error.message : 'Unknown error'}`
      );
      this.logger.logError(error, 'UPLOADING_IMAGES', {
        operation: 'batch_fetch',
        failureCount: errors.length
      });
      throw error;
    }

    // Log summary
    this.logger.logStageComplete('UPLOADING_IMAGES', {
      operation: 'batch_fetch',
      successCount: results.size,
      failureCount: errors.length,
      totalCount: urls.length
    });

    return results;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Must be http or https
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is from Supabase Storage
   */
  private isSupabaseUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Check for common Supabase Storage patterns
      return (
        parsed.hostname.includes('supabase.co') ||
        parsed.hostname.includes('supabase.io') ||
        parsed.pathname.includes('/storage/v1/')
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if content type is a valid image type
   */
  private isImageContentType(contentType: string): boolean {
    const imageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    const parts = contentType.toLowerCase().split(';');
    const normalized = parts[0]?.trim() || '';
    return imageTypes.some(type => normalized === type || normalized.startsWith('image/'));
  }

  /**
   * Format bytes for human-readable display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Sanitize URL for logging (remove query params that might contain tokens)
   */
  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Keep protocol, hostname, and pathname only
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    } catch {
      // If URL parsing fails, just return a placeholder
      return '[invalid-url]';
    }
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class ImageFetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ImageFetchError';
  }
}

export class ImageFetchTimeoutError extends Error {
  constructor(
    public readonly url: string,
    public readonly timeout: number
  ) {
    super(`Image fetch timeout after ${timeout}ms`);
    this.name = 'ImageFetchTimeoutError';
  }
}

export class ImageFetchValidationError extends Error {
  constructor(
    message: string,
    public readonly url: string
  ) {
    super(message);
    this.name = 'ImageFetchValidationError';
  }
}

