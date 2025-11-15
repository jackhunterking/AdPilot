/**
 * Feature: Homepage Business Image Generation API
 * Purpose: Generate realistic business images one at a time using Google Gemini
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 */

import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

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

    // Generate image using Google Gemini
    const result = await generateText({
      model: 'google/gemini-2.5-flash-image-preview',
      prompt: enhancedPrompt,
      providerOptions: {
        google: { 
          responseModalities: ['TEXT', 'IMAGE'] 
        },
      },
    });

    // Extract image from result.files
    let imageBuffer: Buffer | null = null;
    for (const file of result.files) {
      if (file.mediaType.startsWith('image/')) {
        imageBuffer = Buffer.from(file.uint8Array);
        break;
      }
    }

    if (!imageBuffer) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No image was generated in the response' 
        },
        { status: 500 }
      );
    }

    // Save to /public/{fileName}
    const publicDir = path.join(process.cwd(), 'public');
    const filePath = path.join(publicDir, fileName);
    
    fs.writeFileSync(filePath, imageBuffer);

    console.log(`✅ Image saved successfully: /public/${fileName}`);

    return NextResponse.json({
      success: true,
      imageUrl: `/${fileName}`,
      message: `Successfully generated image for ${businessName}`,
    });

  } catch (error) {
    console.error('❌ Error generating homepage image:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

