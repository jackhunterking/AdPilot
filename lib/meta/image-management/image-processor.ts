/**
 * Feature: Image Processor for Meta Ad Publishing
 * Purpose: Process images for Meta upload (format conversion, optimization, resizing)
 * References:
 *  - Sharp Documentation: https://sharp.pixelplumbing.com/
 *  - Meta Image Specs: https://developers.facebook.com/docs/marketing-api/creative-specifications
 */

import sharp from 'sharp';
import { createHash } from 'crypto';
import { IMAGE_REQUIREMENTS } from '../config/publishing-config';
import type { ProcessedImage } from '../types/publishing';

// ============================================================================
// IMAGE PROCESSOR CLASS
// ============================================================================

export class ImageProcessor {
  /**
   * Process an image for Meta upload
   * @param inputBuffer - Original image buffer
   * @param targetFormat - Target format (feed, story, reel)
   * @returns Processed image with metadata
   */
  async process(
    inputBuffer: Buffer,
    targetFormat: 'feed' | 'story' | 'reel' = 'feed'
  ): Promise<ProcessedImage> {
    let pipeline = sharp(inputBuffer);

    // Get original metadata
    const metadata = await pipeline.metadata();

    // ========================================================================
    // STEP 1: FIX ORIENTATION
    // ========================================================================
    // Auto-rotate based on EXIF orientation data
    pipeline = pipeline.rotate();

    // ========================================================================
    // STEP 2: REMOVE ALPHA CHANNEL
    // ========================================================================
    // Meta requires RGB, convert RGBA to RGB with white background
    if (metadata.hasAlpha) {
      pipeline = pipeline.flatten({ 
        background: { r: 255, g: 255, b: 255 } 
      });
    }

    // ========================================================================
    // STEP 3: CONVERT COLOR SPACE
    // ========================================================================
    // Ensure sRGB color space
    pipeline = pipeline.toColorspace('srgb');

    // ========================================================================
    // STEP 4: RESIZE IF NEEDED
    // ========================================================================
    const maxDim = IMAGE_REQUIREMENTS.maxDimensions;
    const recommendedDim = IMAGE_REQUIREMENTS.recommendedDimensions[targetFormat];

    if (metadata.width && metadata.height) {
      // If image exceeds maximum dimensions, resize
      if (metadata.width > maxDim.width || metadata.height > maxDim.height) {
        pipeline = pipeline.resize(maxDim.width, maxDim.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      // Optionally resize to recommended dimensions for optimal performance
      else if (this.shouldResizeToRecommended(metadata.width, metadata.height, recommendedDim)) {
        pipeline = pipeline.resize(recommendedDim.width, recommendedDim.height, {
          fit: 'cover', // Crop to fill if needed
          position: 'center'
        });
      }
    }

    // ========================================================================
    // STEP 5: OPTIMIZE AND CONVERT TO JPEG
    // ========================================================================
    // Convert to JPEG for best compatibility and compression
    pipeline = pipeline.jpeg({
      quality: 90, // High quality for ads
      progressive: true, // Progressive loading
      mozjpeg: true, // Use mozjpeg for better compression
      chromaSubsampling: '4:4:4' // Best quality chroma subsampling
    });

    // ========================================================================
    // STEP 6: PROCESS AND EXTRACT METADATA
    // ========================================================================
    const buffer = await pipeline.toBuffer();
    const finalMetadata = await sharp(buffer).metadata();

    // Calculate MD5 hash for deduplication
    const hash = createHash('md5').update(buffer).digest('hex');

    return {
      buffer,
      hash,
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      format: 'jpeg',
      size: buffer.length
    };
  }

  /**
   * Process image with custom dimensions
   */
  async processWithDimensions(
    inputBuffer: Buffer,
    targetWidth: number,
    targetHeight: number
  ): Promise<ProcessedImage> {
    let pipeline = sharp(inputBuffer);

    // Auto-rotate
    pipeline = pipeline.rotate();

    // Remove alpha
    const metadata = await pipeline.metadata();
    if (metadata.hasAlpha) {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }

    // Convert colorspace
    pipeline = pipeline.toColorspace('srgb');

    // Resize to exact dimensions
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: 'cover',
      position: 'center'
    });

    // Convert to JPEG
    pipeline = pipeline.jpeg({
      quality: 90,
      progressive: true,
      mozjpeg: true
    });

    // Process
    const buffer = await pipeline.toBuffer();
    const finalMetadata = await sharp(buffer).metadata();
    const hash = createHash('md5').update(buffer).digest('hex');

    return {
      buffer,
      hash,
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      format: 'jpeg',
      size: buffer.length
    };
  }

  /**
   * Process image without resizing (only format conversion and optimization)
   */
  async processWithoutResize(inputBuffer: Buffer): Promise<ProcessedImage> {
    let pipeline = sharp(inputBuffer);

    // Auto-rotate
    pipeline = pipeline.rotate();

    // Remove alpha if present
    const metadata = await pipeline.metadata();
    if (metadata.hasAlpha) {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }

    // Convert colorspace
    pipeline = pipeline.toColorspace('srgb');

    // Convert to JPEG
    pipeline = pipeline.jpeg({
      quality: 90,
      progressive: true,
      mozjpeg: true
    });

    // Process
    const buffer = await pipeline.toBuffer();
    const finalMetadata = await sharp(buffer).metadata();
    const hash = createHash('md5').update(buffer).digest('hex');

    return {
      buffer,
      hash,
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      format: 'jpeg',
      size: buffer.length
    };
  }

  /**
   * Extract metadata without processing
   */
  async getMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    return await sharp(buffer).metadata();
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(
    inputBuffer: Buffer,
    maxWidth: number = 300,
    maxHeight: number = 300
  ): Promise<Buffer> {
    return await sharp(inputBuffer)
      .rotate()
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: false
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  /**
   * Batch process multiple images
   */
  async processBatch(
    images: Array<{ buffer: Buffer; url: string; format?: 'feed' | 'story' | 'reel' }>
  ): Promise<Map<string, ProcessedImage>> {
    const results = new Map<string, ProcessedImage>();

    for (const image of images) {
      try {
        const processed = await this.process(image.buffer, image.format || 'feed');
        results.set(image.url, processed);
      } catch (error) {
        // Log error but continue processing other images
        console.error(`Failed to process image ${image.url}:`, error);
        throw new ImageProcessingError(
          `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
          image.url
        );
      }
    }

    return results;
  }

  /**
   * Compress image to target file size (iterative quality reduction)
   */
  async compressToSize(
    inputBuffer: Buffer,
    maxSizeBytes: number,
    minQuality: number = 60
  ): Promise<Buffer> {
    let quality = 90;
    let compressed: Buffer;

    do {
      compressed = await sharp(inputBuffer)
        .rotate()
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer();

      if (compressed.length <= maxSizeBytes || quality <= minQuality) {
        break;
      }

      quality -= 5; // Reduce quality by 5% each iteration
    } while (quality >= minQuality);

    return compressed;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Determine if image should be resized to recommended dimensions
   */
  private shouldResizeToRecommended(
    currentWidth: number,
    currentHeight: number,
    recommended: { width: number; height: number }
  ): boolean {
    // Only resize if image is significantly different from recommended
    const widthDiff = Math.abs(currentWidth - recommended.width) / recommended.width;
    const heightDiff = Math.abs(currentHeight - recommended.height) / recommended.height;

    // If dimensions differ by more than 20%, resize
    return widthDiff > 0.2 || heightDiff > 0.2;
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class ImageProcessingError extends Error {
  constructor(
    message: string,
    public readonly url?: string
  ) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an image processor instance
 */
export function createImageProcessor(): ImageProcessor {
  return new ImageProcessor();
}

/**
 * Calculate optimal quality for target file size
 */
export function calculateOptimalQuality(
  originalSize: number,
  targetSize: number
): number {
  // Simple estimation: reduce quality proportionally
  const ratio = targetSize / originalSize;
  
  if (ratio >= 1) return 90; // No reduction needed
  if (ratio >= 0.5) return 85;
  if (ratio >= 0.3) return 80;
  if (ratio >= 0.2) return 75;
  return 70;
}

/**
 * Estimate compressed size for a given quality
 */
export function estimateCompressedSize(
  originalSize: number,
  quality: number
): number {
  // Very rough estimation
  const compressionFactor = quality / 100;
  return Math.floor(originalSize * compressionFactor * 0.7);
}

/**
 * Check if image needs processing
 */
export async function needsProcessing(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    
    // Needs processing if:
    // - Has alpha channel
    // - Not JPEG format
    // - Has EXIF orientation
    // - Not sRGB colorspace
    // - Exceeds max dimensions
    
    return !!(
      metadata.hasAlpha ||
      (metadata.format !== 'jpeg' && metadata.format !== 'jpg') ||
      (metadata.orientation && metadata.orientation > 1) ||
      (metadata.space && metadata.space !== 'srgb') ||
      (metadata.width && metadata.width > IMAGE_REQUIREMENTS.maxDimensions.width) ||
      (metadata.height && metadata.height > IMAGE_REQUIREMENTS.maxDimensions.height)
    );
  } catch {
    // If we can't read metadata, assume it needs processing
    return true;
  }
}

