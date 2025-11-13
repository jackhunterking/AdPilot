/**
 * Feature: Image Validator for Meta Ad Publishing
 * Purpose: Validate images meet Meta API v24.0 requirements
 * References:
 *  - Meta Creative Specs: https://developers.facebook.com/docs/marketing-api/creative-specifications
 *  - Meta AdImage API: https://developers.facebook.com/docs/marketing-api/reference/ad-image
 */

import sharp from 'sharp';
import { IMAGE_REQUIREMENTS } from '../config/publishing-config';
import type { ImageValidationResult, ImageValidationError, ImageValidationWarning } from '../types/publishing';

// ============================================================================
// IMAGE VALIDATOR CLASS
// ============================================================================

export class ImageValidator {
  /**
   * Validate an image buffer against Meta requirements
   * @param buffer - Image buffer to validate
   * @param format - Target format (feed, story, reel)
   * @returns Validation result with errors and warnings
   */
  async validate(
    buffer: Buffer,
    format: 'feed' | 'story' | 'reel' = 'feed'
  ): Promise<ImageValidationResult> {
    const errors: ImageValidationError[] = [];
    const warnings: ImageValidationWarning[] = [];

    try {
      // Get image metadata using sharp
      const metadata = await sharp(buffer).metadata();

      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const aspectRatio = width && height ? width / height : 0;
      const fileSize = buffer.length;

      // ========================================================================
      // DIMENSION VALIDATION
      // ========================================================================

      // Check minimum dimensions
      if (width < IMAGE_REQUIREMENTS.minDimensions.width || 
          height < IMAGE_REQUIREMENTS.minDimensions.height) {
        errors.push({
          code: 'DIMENSIONS_TOO_SMALL',
          message: `Image dimensions ${width}x${height} below minimum ` +
                   `${IMAGE_REQUIREMENTS.minDimensions.width}x${IMAGE_REQUIREMENTS.minDimensions.height}`,
          severity: 'ERROR'
        });
      }

      // Check maximum dimensions (will need resizing)
      if (width > IMAGE_REQUIREMENTS.maxDimensions.width || 
          height > IMAGE_REQUIREMENTS.maxDimensions.height) {
        warnings.push({
          code: 'DIMENSIONS_TOO_LARGE',
          message: `Image ${width}x${height} exceeds maximum ` +
                   `${IMAGE_REQUIREMENTS.maxDimensions.width}x${IMAGE_REQUIREMENTS.maxDimensions.height}. ` +
                   `Will be resized.`,
          severity: 'WARNING'
        });
      }

      // Check for square images when needed
      if (format === 'feed' && Math.abs(aspectRatio - 1.0) > 0.1) {
        warnings.push({
          code: 'ASPECT_RATIO_NOT_SQUARE',
          message: `Feed ads perform best with square images (1:1). Current ratio: ${aspectRatio.toFixed(2)}:1`,
          severity: 'WARNING'
        });
      }

      // ========================================================================
      // ASPECT RATIO VALIDATION
      // ========================================================================

      const ratioLimits = IMAGE_REQUIREMENTS.aspectRatios[format];
      
      // For story/reel (exact 9:16 requirement)
      if ((format === 'story' || format === 'reel') && 
          Math.abs(aspectRatio - ratioLimits.min) > 0.01) {
        errors.push({
          code: 'INVALID_ASPECT_RATIO',
          message: `${format} requires 9:16 aspect ratio. Current: ${aspectRatio.toFixed(2)}:1`,
          severity: 'ERROR'
        });
      }

      // For feed (flexible range)
      if (format === 'feed') {
        if (aspectRatio < ratioLimits.min || aspectRatio > ratioLimits.max) {
          warnings.push({
            code: 'ASPECT_RATIO_SUBOPTIMAL',
            message: `Aspect ratio ${aspectRatio.toFixed(2)}:1 outside optimal range ` +
                     `${ratioLimits.min}:1 to ${ratioLimits.max}:1 for ${format}`,
            severity: 'WARNING'
          });
        }
      }

      // ========================================================================
      // FILE SIZE VALIDATION
      // ========================================================================

      if (fileSize > IMAGE_REQUIREMENTS.maxFileSize) {
        errors.push({
          code: 'FILE_TOO_LARGE',
          message: `File size ${this.formatBytes(fileSize)} exceeds maximum ` +
                   `${this.formatBytes(IMAGE_REQUIREMENTS.maxFileSize)}`,
          severity: 'ERROR'
        });
      }

      // Warn if file is very small (might be low quality)
      if (fileSize < 10000) { // 10KB
        warnings.push({
          code: 'FILE_VERY_SMALL',
          message: `File size ${this.formatBytes(fileSize)} is very small. Image quality may be poor.`,
          severity: 'WARNING'
        });
      }

      // ========================================================================
      // FORMAT VALIDATION
      // ========================================================================

      const format_meta = metadata.format?.toLowerCase();
      
      if (!format_meta) {
        errors.push({
          code: 'UNKNOWN_FORMAT',
          message: 'Unable to determine image format',
          severity: 'ERROR'
        });
      } else if (format_meta !== 'jpeg' && format_meta !== 'jpg' && format_meta !== 'png') {
        // Meta accepts JPEG and PNG; other formats need conversion
        warnings.push({
          code: 'UNSUPPORTED_FORMAT',
          message: `Format ${format_meta} will be converted to JPEG for Meta`,
          severity: 'WARNING'
        });
      }

      // ========================================================================
      // COLOR SPACE VALIDATION
      // ========================================================================

      // Check for alpha channel (Meta requires RGB)
      if (metadata.hasAlpha) {
        warnings.push({
          code: 'HAS_ALPHA_CHANNEL',
          message: 'Image has alpha channel (transparency). Will be converted to RGB with white background.',
          severity: 'WARNING'
        });
      }

      // Check color space
      if (metadata.space && metadata.space !== 'srgb') {
        warnings.push({
          code: 'NON_SRGB_COLORSPACE',
          message: `Color space ${metadata.space} will be converted to sRGB`,
          severity: 'WARNING'
        });
      }

      // Check for CMYK (not supported)
      if (metadata.space === 'cmyk') {
        errors.push({
          code: 'CMYK_NOT_SUPPORTED',
          message: 'CMYK color space not supported. Must be RGB.',
          severity: 'ERROR'
        });
      }

      // ========================================================================
      // ADDITIONAL CHECKS
      // ========================================================================

      // Check for animated images
      if (metadata.pages && metadata.pages > 1) {
        errors.push({
          code: 'ANIMATED_IMAGE',
          message: `Animated images not supported. Found ${metadata.pages} frames.`,
          severity: 'ERROR'
        });
      }

      // Check for invalid EXIF orientation
      if (metadata.orientation && metadata.orientation > 1) {
        warnings.push({
          code: 'HAS_EXIF_ORIENTATION',
          message: 'Image has EXIF orientation data. Will be auto-rotated.',
          severity: 'WARNING'
        });
      }

      // Check density (DPI) - warn if very low
      if (metadata.density && metadata.density < 72) {
        warnings.push({
          code: 'LOW_DPI',
          message: `Low image density (${metadata.density} DPI). May appear pixelated.`,
          severity: 'WARNING'
        });
      }

      // ========================================================================
      // RETURN RESULTS
      // ========================================================================

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        dimensions: { width, height },
        aspectRatio,
        fileSize
      };

    } catch (error) {
      // Validation failed catastrophically
      errors.push({
        code: 'VALIDATION_FAILED',
        message: error instanceof Error 
          ? `Image validation error: ${error.message}` 
          : 'Unknown validation error',
        severity: 'CRITICAL'
      });

      return {
        isValid: false,
        errors,
        warnings,
        dimensions: { width: 0, height: 0 },
        aspectRatio: 0,
        fileSize: buffer.length
      };
    }
  }

  /**
   * Quick validation check (faster, less comprehensive)
   * Useful for pre-screening before full validation
   */
  async quickValidate(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();

      // Check basic requirements only
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const size = buffer.length;

      return (
        width >= IMAGE_REQUIREMENTS.minDimensions.width &&
        height >= IMAGE_REQUIREMENTS.minDimensions.height &&
        size <= IMAGE_REQUIREMENTS.maxFileSize &&
        (metadata.format === 'jpeg' || metadata.format === 'png' || metadata.format === 'webp')
      );
    } catch {
      return false;
    }
  }

  /**
   * Batch validate multiple images
   */
  async validateBatch(
    images: Array<{ buffer: Buffer; url: string; format?: 'feed' | 'story' | 'reel' }>
  ): Promise<Map<string, ImageValidationResult>> {
    const results = new Map<string, ImageValidationResult>();

    for (const image of images) {
      try {
        const result = await this.validate(image.buffer, image.format || 'feed');
        results.set(image.url, result);
      } catch (error) {
        // If validation throws, create an error result
        results.set(image.url, {
          isValid: false,
          errors: [{
            code: 'VALIDATION_EXCEPTION',
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: 'CRITICAL'
          }],
          warnings: [],
          dimensions: { width: 0, height: 0 },
          aspectRatio: 0,
          fileSize: image.buffer.length
        });
      }
    }

    return results;
  }

  /**
   * Get recommended dimensions for a format
   */
  getRecommendedDimensions(format: 'feed' | 'story' | 'reel'): { width: number; height: number } {
    return IMAGE_REQUIREMENTS.recommendedDimensions[format];
  }

  /**
   * Check if dimensions meet minimum requirements
   */
  meetsMinimumDimensions(width: number, height: number): boolean {
    return (
      width >= IMAGE_REQUIREMENTS.minDimensions.width &&
      height >= IMAGE_REQUIREMENTS.minDimensions.height
    );
  }

  /**
   * Check if file size is within limits
   */
  isValidFileSize(size: number): boolean {
    return size > 0 && size <= IMAGE_REQUIREMENTS.maxFileSize;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

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
}

// ============================================================================
// VALIDATION ERROR CLASSES
// ============================================================================

export class ImageValidationFailedError extends Error {
  constructor(
    public readonly errors: ImageValidationError[],
    public readonly warnings: ImageValidationWarning[]
  ) {
    super(`Image validation failed with ${errors.length} error(s)`);
    this.name = 'ImageValidationFailedError';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a validator instance
 */
export function createImageValidator(): ImageValidator {
  return new ImageValidator();
}

/**
 * Quick check if image format is supported
 */
export function isSupportedFormat(format: string): boolean {
  const supported = ['jpeg', 'jpg', 'png', 'webp'];
  return supported.includes(format.toLowerCase());
}

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(width: number, height: number): number {
  if (height === 0) return 0;
  return width / height;
}

/**
 * Check if aspect ratio is within acceptable range
 */
export function isAcceptableAspectRatio(
  ratio: number,
  format: 'feed' | 'story' | 'reel'
): boolean {
  const limits = IMAGE_REQUIREMENTS.aspectRatios[format];
  
  if (format === 'story' || format === 'reel') {
    // Strict requirement for story/reel (9:16)
    return Math.abs(ratio - limits.min) <= 0.01;
  }
  
  // Flexible for feed
  return ratio >= limits.min && ratio <= limits.max;
}

