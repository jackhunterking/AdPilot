import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToSupabase } from '@/server/images';

export const maxDuration = 30; // 30 seconds for single variation

export async function POST(req: NextRequest) {
    try {
        const { baseImageUrl, variationIndex, campaignId } = await req.json();

        if (!baseImageUrl || variationIndex === undefined) {
            return NextResponse.json(
                { error: 'baseImageUrl and variationIndex are required' },
                { status: 400 }
            );
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
                variation = await sharp(imageBuffer)
                    .png()
                    .toBuffer();
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
                    .resize(originalWidth, originalHeight, {
                        fit: 'fill',
                        kernel: 'lanczos3'
                    })
                    .png()
                    .toBuffer();
                break;

            default:
                throw new Error(`Invalid variation index: ${variationIndex}`);
        }

        // Upload to Supabase
        const url = await uploadToSupabase(
            variation,
            `variation-${variationIndex + 1}-${variationName}-${timestamp}.png`,
            campaignId
        );

        console.log(`✅ Generated variation ${variationIndex + 1}: ${url}`);

        return NextResponse.json({
            success: true,
            variationUrl: url,
            variationIndex,
            variationName
        });

    } catch (error) {
        console.error('Error generating single variation:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate variation',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

