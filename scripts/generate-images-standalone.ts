#!/usr/bin/env tsx

/**
 * Standalone image generation script
 * No dependencies on server modules
 */

// Load env first
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

import { generateText } from 'ai';
import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

interface BusinessImage {
  fileName: string;
  prompt: string;
  businessName: string;
}

function enhancePrompt(basePrompt: string): string {
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

// First 5 businesses for testing
const businesses: BusinessImage[] = [
  {
    fileName: 'dental-office-smile.jpg',
    businessName: 'UrbanGlow Dental',
    prompt: 'Professional dental office with patient smiling after treatment, bright and clean, modern interior, natural lighting, professional photography'
  },
  {
    fileName: 'personal-trainer-workout.jpg',
    businessName: 'PrimeFit Personal Training',
    prompt: 'Personal trainer helping client with exercise in modern gym, motivational atmosphere, professional fitness training, natural gym lighting'
  },
  {
    fileName: 'clean-home-interior.jpg',
    businessName: 'FreshNest Cleaning Co.',
    prompt: 'Spotless, organized home interior, clean living room, fresh and tidy, bright natural light, professional cleaning result'
  },
  {
    fileName: 'detailed-shiny-car.jpg',
    businessName: 'SparkRide Auto Detailing',
    prompt: 'Shiny, freshly detailed luxury car exterior, water droplets on hood, professional car detailing, high-end automobile, studio lighting'
  },
  {
    fileName: 'beautiful-landscaped-yard.jpg',
    businessName: 'Bloomfield Landscaping',
    prompt: 'Professional landscaped backyard with lush green grass, flower beds, stone pathway, summer day, real estate photography quality'
  },
];

async function generateOne(business: BusinessImage): Promise<boolean> {
  try {
    console.log(`\n🎨 Generating image for ${business.businessName}...`);
    
    const enhancedPrompt = enhancePrompt(business.prompt);
    
    // Generate using Google Gemini directly
    const result = await generateText({
      model: 'google/gemini-2.5-flash-image-preview',
      prompt: enhancedPrompt,
      providerOptions: {
        google: { 
          responseModalities: ['TEXT', 'IMAGE'] 
        },
      },
    });
    
    // Extract image
    let imageBuffer: Buffer | null = null;
    for (const file of result.files) {
      if (file.mediaType.startsWith('image/')) {
        imageBuffer = Buffer.from(file.uint8Array);
        break;
      }
    }
    
    if (!imageBuffer) {
      console.log('❌ No image generated');
      return false;
    }
    
    console.log(`✅ Image generated successfully`);
    
    // Save to /public/
    const publicDir = path.join(process.cwd(), 'public');
    const filePath = path.join(publicDir, business.fileName);
    fs.writeFileSync(filePath, imageBuffer);
    
    console.log(`✅ Saved to: /public/${business.fileName}`);
    console.log(`   View at: http://localhost:3000/${business.fileName}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function main() {
  console.log('\n🎨 Homepage Business Image Generator\n');
  console.log(`Generating ${businesses.length} test images...\n`);
  
  const answer = await question('Ready to start? (y/n): ');
  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    return;
  }
  
  let successCount = 0;
  
  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];
    
    if (!business) {
      console.log(`\n⚠️ Skipping undefined business at index ${i}`);
      continue;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${i + 1}/${businesses.length}: ${business.businessName}`);
    console.log(`${'='.repeat(60)}`);
    
    const success = await generateOne(business);
    
    if (success) {
      successCount++;
      
      if (i < businesses.length - 1) {
        const cont = await question('\nContinue? (y/n/q): ');
        if (cont.toLowerCase() === 'q') {
          console.log('\nStopping...');
          break;
        } else if (cont.toLowerCase() === 'n') {
          console.log('Skipping...');
          continue;
        }
      }
    } else {
      const retry = await question('\nRetry? (y/n): ');
      if (retry.toLowerCase() === 'y') {
        i--; // Retry
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Complete! Generated ${successCount}/${businesses.length} images`);
  console.log(`${'='.repeat(60)}\n`);
  
  rl.close();
}

main().catch(console.error);

