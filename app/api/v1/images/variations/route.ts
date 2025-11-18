import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToSupabase } from '@/server/images';

export const maxDuration = 30; // Allow up to 30 seconds for processing 3 variations

export async function POST(req: NextRequest) {
    try {
        const { baseImageUrl, campaignId } = await req.json();

        if (!baseImageUrl) {
            return NextResponse.json(
                { error: 'baseImageUrl is required' },
                { status: 400 }
            );
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

        return NextResponse.json({
            success: true,
            variations,
            baseImageUrl
        });

    } catch (error) {
        console.error('Error generating variations:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate variations',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

