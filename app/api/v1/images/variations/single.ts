/**
 * Feature: Single Image Variation API (v1)
 * Purpose: Generate a single image variation using sharp
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Sharp: https://sharp.pixelplumbing.com/
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware';
import sharp from 'sharp';
import { uploadToSupabase } from '@/server/images';

export const maxDuration = 30; // 30 seconds for single variation

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const body: unknown = await req.json();
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body');
    }

    const { baseImageUrl, variationIndex, campaignId } = body as { 
      baseImageUrl?: string; 
      variationIndex?: number; 
      campaignId?: string 
    };

    if (!baseImageUrl || variationIndex === undefined) {
      throw new ValidationError('baseImageUrl and variationIndex are required');
    }

    console.log(`🎨 Generating variation ${variationIndex + 1} for image: ${baseImageUrl}`);

    // Fetch the base image
    const imageResponse = await fetch(baseImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Get original image metadata
    const imageMetadata = await sharp(imageBuffer).metadata();
    const originalWidth = imageMetadata.width || 1024;
    const originalHeight = imageMetadata.height || 1024;

    const timestamp = Date.now();
    let variation: Buffer;
    let variationName: string;

    // Generate variation based on index
    switch (variationIndex) {
      case 0: // Original
        variationName = 'original';
        variation = await sharp(imageBuffer).png().toBuffer();
        break;

      case 1: // Warm tone
        variationName = 'warm';
        variation = await sharp(imageBuffer)
          .modulate({
            brightness: 1.05,
            saturation: 1.1,
            hue: 10
          })
          .png()
          .toBuffer();
        break;

      case 2: // Cool tone
        variationName = 'cool';
        variation = await sharp(imageBuffer)
          .modulate({
            brightness: 1.05,
            saturation: 1.1,
            hue: -10
          })
          .png()
          .toBuffer();
        break;

      case 3: // High contrast
        variationName = 'contrast';
        variation = await sharp(imageBuffer)
          .normalize()
          .modulate({
            saturation: 1.2
          })
          .png()
          .toBuffer();
        break;

      case 4: // Soft/muted
        variationName = 'soft';
        variation = await sharp(imageBuffer)
          .blur(0.5)
          .modulate({
            saturation: 0.8
          })
          .png()
          .toBuffer();
        break;

      case 5: // Zoomed crop
        variationName = 'zoom';
        const cropPercentage = 0.85;
        const newWidth = Math.floor(originalWidth * cropPercentage);
        const newHeight = Math.floor(originalHeight * cropPercentage);
        const left = Math.floor((originalWidth - newWidth) / 2);
        const top = Math.floor((originalHeight - newHeight) / 2);

        variation = await sharp(imageBuffer)
          .extract({
            left,
            top,
            width: newWidth,
            height: newHeight
          })
          .resize(originalWidth, originalHeight)
          .png()
          .toBuffer();
        break;

      default:
        variationName = 'original';
        variation = await sharp(imageBuffer).png().toBuffer();
    }

    const url = await uploadToSupabase(
      variation,
      `variation-${variationIndex}-${variationName}-${timestamp}.png`,
      campaignId
    );

    console.log(`✅ Successfully generated variation ${variationIndex + 1}: ${variationName}`);

    return successResponse({
      variation: url,
      variationIndex,
      variationName
    });

  } catch (error) {
    console.error('[POST /api/v1/images/variations/single] Error:', error);
    return errorResponse(error as Error);
  }
}
