/**
 * Feature: Image Variations API (v1)
 * Purpose: Generate multiple image variations using sharp
 * References:
 *  - API v1 Middleware: app/api/v1/_middleware.ts
 *  - Sharp: https://sharp.pixelplumbing.com/
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse, ValidationError } from '@/app/api/v1/_middleware';
import sharp from 'sharp';
import { uploadToSupabase } from '@/server/images';

export const maxDuration = 30; // Allow up to 30 seconds for processing 3 variations

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    // Apply rate limiting (10 req/min for image generation)
    const { checkRateLimit } = await import('@/app/api/v1/_middleware');
    await checkRateLimit(user.id, '/api/v1/images/variations', 10);
    
    const body: unknown = await req.json();
    
    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Invalid request body');
    }

    const { baseImageUrl, campaignId } = body as { baseImageUrl?: string; campaignId?: string };

    if (!baseImageUrl) {
      throw new ValidationError('baseImageUrl is required');
    }

    console.log(`🎨 Generating 3 variations for image: ${baseImageUrl}`);

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

    console.log(`📐 Original dimensions: ${originalWidth}x${originalHeight}`);

    const timestamp = Date.now();
    const variations: string[] = [];

    // Variation 1: Original (no changes, just re-upload for consistency)
    console.log('Creating variation 1/3: Original...');
    const variation1 = await sharp(imageBuffer)
      .png()
      .toBuffer();
    const url1 = await uploadToSupabase(
      variation1,
      `variation-1-original-${timestamp}.png`,
      campaignId
    );
    variations.push(url1);

    // Variation 2: Warm tone
    console.log('Creating variation 2/3: Warm tone...');
    const variation2 = await sharp(imageBuffer)
      .modulate({
        brightness: 1.05,
        saturation: 1.1,
        hue: 10
      })
      .png()
      .toBuffer();
    const url2 = await uploadToSupabase(
      variation2,
      `variation-2-warm-${timestamp}.png`,
      campaignId
    );
    variations.push(url2);

    // Variation 3: High contrast
    console.log('Creating variation 3/3: High contrast...');
    const variation3 = await sharp(imageBuffer)
      .normalize()
      .modulate({
        saturation: 1.2
      })
      .png()
      .toBuffer();
    const url3 = await uploadToSupabase(
      variation3,
      `variation-3-contrast-${timestamp}.png`,
      campaignId
    );
    variations.push(url3);

    console.log(`✅ Successfully generated ${variations.length} variations`);

    return successResponse({
      variations,
      baseImageUrl
    });

  } catch (error) {
    console.error('[POST /api/v1/images/variations] Error:', error);
    return errorResponse(error as Error);
  }
}
