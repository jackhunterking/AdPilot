/**
 * Feature: Image Upload Orchestrator
 * Purpose: Coordinate the complete image upload pipeline (fetch → validate → process → upload)
 * References:
 *  - Meta Marketing API v24.0: https://developers.facebook.com/docs/marketing-api
 */

import type { PublishLogger } from '../observability/publish-logger';
import { ImageFetcher } from './image-fetcher';
import { ImageValidator } from './image-validator';
import { ImageProcessor } from './image-processor';
import { MetaImageUploader } from './meta-image-uploader';
import type { MetaImageUploadResult, ImageValidationResult } from '../types/publishing';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadProgress {
  url: string;
  stage: 'fetching' | 'validating' | 'processing' | 'uploading' | 'complete' | 'failed';
  progress: number; // 0-100
  error?: string;
}

export interface ImageUploadResult {
  url: string;
  metaResult: MetaImageUploadResult;
  validation: ImageValidationResult;
  processingTime: number;
}

export interface BatchUploadResult {
  successful: Map<string, ImageUploadResult>;
  failed: Map<string, Error>;
  totalTime: number;
}

export type ProgressCallback = (progress: UploadProgress) => void;

// ============================================================================
// IMAGE UPLOAD ORCHESTRATOR CLASS
// ============================================================================

export class ImageUploadOrchestrator {
  private fetcher: ImageFetcher;
  private validator: ImageValidator;
  private processor: ImageProcessor;
  private uploader: MetaImageUploader;
  private logger: PublishLogger;

  constructor(token: string, adAccountId: string, logger: PublishLogger) {
    this.fetcher = new ImageFetcher(logger);
    this.validator = new ImageValidator();
    this.processor = new ImageProcessor();
    this.uploader = new MetaImageUploader(token, adAccountId, logger);
    this.logger = logger;
  }

  /**
   * Upload a single image through the complete pipeline
   */
  async uploadSingleImage(
    url: string,
    format: 'feed' | 'story' | 'reel' = 'feed',
    onProgress?: ProgressCallback
  ): Promise<ImageUploadResult> {
    const startTime = Date.now();

    this.logger.logStageStart('UPLOADING_IMAGES', {
      operation: 'single_upload',
      url,
      format
    });

    try {
      // ========================================================================
      // STEP 1: FETCH IMAGE
      // ========================================================================
      onProgress?.({
        url,
        stage: 'fetching',
        progress: 10
      });

      const fetchResult = await this.fetcher.fetchImage(url);

      // ========================================================================
      // STEP 2: VALIDATE IMAGE
      // ========================================================================
      onProgress?.({
        url,
        stage: 'validating',
        progress: 30
      });

      const validation = await this.validator.validate(fetchResult.buffer, format);

      if (!validation.isValid) {
        const errorMsg = validation.errors[0]?.message || 'Validation failed';
        throw new Error(`Image validation failed: ${errorMsg}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          this.logger.logWarning(warning.message, { url, code: warning.code });
        });
      }

      // ========================================================================
      // STEP 3: PROCESS IMAGE
      // ========================================================================
      onProgress?.({
        url,
        stage: 'processing',
        progress: 50
      });

      const processed = await this.processor.process(fetchResult.buffer, format);

      // ========================================================================
      // STEP 4: UPLOAD TO META
      // ========================================================================
      onProgress?.({
        url,
        stage: 'uploading',
        progress: 70
      });

      const filename = this.generateFilename(url);
      const metaResult = await this.uploader.upload(processed.buffer, filename, processed.hash);

      // ========================================================================
      // COMPLETE
      // ========================================================================
      const processingTime = Date.now() - startTime;

      onProgress?.({
        url,
        stage: 'complete',
        progress: 100
      });

      this.logger.logStageComplete('UPLOADING_IMAGES', {
        operation: 'single_upload',
        url,
        processingTime_ms: processingTime,
        metaHash: metaResult.hash
      });

      return {
        url,
        metaResult,
        validation,
        processingTime
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      onProgress?.({
        url,
        stage: 'failed',
        progress: 0,
        error: err.message
      });

      this.logger.logError(err, 'UPLOADING_IMAGES', { url });
      throw err;
    }
  }

  /**
   * Upload multiple images in batch
   * Processes up to maxConcurrent images simultaneously
   */
  async uploadImages(
    imageUrls: string[],
    format: 'feed' | 'story' | 'reel' = 'feed',
    maxConcurrent: number = 3,
    onProgress?: ProgressCallback
  ): Promise<BatchUploadResult> {
    const startTime = Date.now();

    this.logger.logStageStart('UPLOADING_IMAGES', {
      operation: 'batch_upload',
      count: imageUrls.length,
      maxConcurrent
    });

    const successful = new Map<string, ImageUploadResult>();
    const failed = new Map<string, Error>();

    // Process images in batches to control concurrency
    for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
      const batch = imageUrls.slice(i, i + maxConcurrent);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(url => this.uploadSingleImage(url, format, onProgress))
      );

      // Collect results
      batchResults.forEach((result, index) => {
        const url = batch[index];
        
        if (!url) return; // Skip if undefined

        if (result.status === 'fulfilled') {
          successful.set(url, result.value);
        } else {
          const error = result.reason instanceof Error 
            ? result.reason 
            : new Error('Unknown error');
          failed.set(url, error);

          this.logger.logError(error, 'UPLOADING_IMAGES', {
            operation: 'batch_upload',
            url
          });
        }
      });
    }

    const totalTime = Date.now() - startTime;

    // Check results
    if (successful.size === 0 && failed.size > 0) {
      const firstError = Array.from(failed.values())[0];
      const error = new Error(
        `All ${failed.size} image(s) failed to upload. First error: ${firstError?.message || 'Unknown error'}`
      );

      this.logger.logError(error, 'UPLOADING_IMAGES', {
        operation: 'batch_upload',
        failureCount: failed.size
      });

      throw error;
    }

    // Log summary
    this.logger.logStageComplete('UPLOADING_IMAGES', {
      operation: 'batch_upload',
      successCount: successful.size,
      failureCount: failed.size,
      totalCount: imageUrls.length,
      totalTime_ms: totalTime
    });

    // Log performance metrics
    if (successful.size > 0) {
      const times = Array.from(successful.values()).map(r => r.processingTime);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      this.logger.logPerformanceMetrics({
        avgUploadTime_ms: Math.round(avgTime),
        maxUploadTime_ms: maxTime,
        minUploadTime_ms: minTime,
        totalTime_ms: totalTime
      });
    }

    return {
      successful,
      failed,
      totalTime
    };
  }

  /**
   * Upload images with automatic retry of failed uploads
   */
  async uploadImagesWithRetry(
    imageUrls: string[],
    format: 'feed' | 'story' | 'reel' = 'feed',
    maxConcurrent: number = 3,
    maxRetries: number = 2,
    onProgress?: ProgressCallback
  ): Promise<BatchUploadResult> {
    let result = await this.uploadImages(imageUrls, format, maxConcurrent, onProgress);
    let retryCount = 0;

    // Retry failed uploads
    while (result.failed.size > 0 && retryCount < maxRetries) {
      retryCount++;

      this.logger.logWarning(`Retrying ${result.failed.size} failed uploads (attempt ${retryCount}/${maxRetries})`);

      const failedUrls = Array.from(result.failed.keys());
      const retryResult = await this.uploadImages(failedUrls, format, maxConcurrent, onProgress);

      // Merge results
      retryResult.successful.forEach((value, key) => {
        result.successful.set(key, value);
        result.failed.delete(key);
      });

      // Update failed list
      result.failed = retryResult.failed;
    }

    return result;
  }

  /**
   * Get mapping of URLs to Meta image hashes
   */
  getImageHashMapping(result: BatchUploadResult): Map<string, string> {
    const mapping = new Map<string, string>();

    result.successful.forEach((uploadResult, url) => {
      mapping.set(url, uploadResult.metaResult.hash);
    });

    return mapping;
  }

  /**
   * Get summary statistics
   */
  getSummary(result: BatchUploadResult): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    avgProcessingTime: number;
  } {
    const total = result.successful.size + result.failed.size;
    const successful = result.successful.size;
    const failed = result.failed.size;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const times = Array.from(result.successful.values()).map(r => r.processingTime);
    const avgProcessingTime = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;

    return {
      total,
      successful,
      failed,
      successRate,
      avgProcessingTime
    };
  }

  /**
   * Clear uploader cache
   */
  clearCache(): void {
    this.uploader.clearCache();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate a unique filename for upload
   */
  private generateFilename(url: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    // Try to extract original filename
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const originalName = pathname.split('/').pop() || 'image';
      const nameWithoutExt = originalName.replace(/\.[^.]+$/, '');

      return `${nameWithoutExt}_${timestamp}_${random}.jpg`;
    } catch {
      return `image_${timestamp}_${random}.jpg`;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an upload orchestrator instance
 */
export function createUploadOrchestrator(
  token: string,
  adAccountId: string,
  logger: PublishLogger
): ImageUploadOrchestrator {
  return new ImageUploadOrchestrator(token, adAccountId, logger);
}

/**
 * Extract just the image hash mapping from results
 */
export function extractImageHashes(result: BatchUploadResult): Record<string, string> {
  const mapping: Record<string, string> = {};

  result.successful.forEach((uploadResult, url) => {
    mapping[url] = uploadResult.metaResult.hash;
  });

  return mapping;
}

/**
 * Check if batch upload was successful
 */
export function isUploadSuccessful(result: BatchUploadResult): boolean {
  return result.failed.size === 0 && result.successful.size > 0;
}

/**
 * Get failed URLs from batch result
 */
export function getFailedUrls(result: BatchUploadResult): string[] {
  return Array.from(result.failed.keys());
}

/**
 * Get successful URLs from batch result
 */
export function getSuccessfulUrls(result: BatchUploadResult): string[] {
  return Array.from(result.successful.keys());
}

