/**
 * Feature: Homepage Business Image Generation API
 * Purpose: Generate realistic business images one at a time using Google Gemini
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/server/images';
import fs from 'node:fs';
import path from 'node:path';

interface GenerateImageRequest {
  fileName: string;
  prompt: string;
  businessName: string;
}

function enhanceHomepageImagePrompt(basePrompt: string): string {
  return `${basePrompt}

CRITICAL REQUIREMENTS:
- Professional photography style, not illustration or digital art
- Hyper-realistic, authentic look (no AI artifacts)
- Well-lit, high-quality, suitable for advertising
- 1080x1080px square format
- No text overlays, no frames, no borders
- No watermarks, labels, or captions
- Clean edges, professional composition
- Suitable for Facebook/Instagram ads

Style: Editorial magazine quality photography with natural lighting and professional composition.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateImageRequest;
    const { fileName, prompt, businessName } = body;

    // Validate input
    if (!fileName || !prompt || !businessName) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: fileName, prompt, and businessName are required' 
        },
        { status: 400 }
      );
    }

    // Validate fileName format
    if (!fileName.endsWith('.jpg') && !fileName.endsWith('.png')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'fileName must end with .jpg or .png' 
        },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating homepage image for ${businessName}...`);
    console.log(`   → Target file: ${fileName}`);

    // Enhance prompt with professional photography requirements
    const enhancedPrompt = enhanceHomepageImagePrompt(prompt);

    // Use existing generateImage function (generates 1 image for cost efficiency)
    const imageUrls = await generateImage(enhancedPrompt, undefined, 1);

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No image was generated' 
        },
        { status: 500 }
      );
    }

    // The image is already uploaded to Supabase by generateImage
    // Now we need to download it and save to /public/ folder
    const supabaseUrl = imageUrls[0];
    
    // Download the image from Supabase
    const response = await fetch(supabaseUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from Supabase: ${response.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Save to /public/{fileName}
    const publicDir = path.join(process.cwd(), 'public');
    const filePath = path.join(publicDir, fileName);
    
    fs.writeFileSync(filePath, imageBuffer);

    console.log(`✅ Image saved successfully: /public/${fileName}`);
    console.log(`   Original Supabase URL: ${supabaseUrl}`);

    return NextResponse.json({
      success: true,
      imageUrl: `/${fileName}`,
      supabaseUrl: supabaseUrl,
      message: `Successfully generated image for ${businessName}`,
    });

  } catch (error) {
    console.error('❌ Error generating homepage image:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : String(error)
      },
      { status: 500 }
    );
  }
}

