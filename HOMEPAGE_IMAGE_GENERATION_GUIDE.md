# Homepage Business Image Generation Guide

## Overview

This guide explains how to use the homepage image generation system to create realistic business images for all 40 mockups using your Google Gemini AI integration.

## What's Been Created

### 1. API Endpoint: `/api/generate-homepage-image`

**Location**: `app/api/generate-homepage-image/route.ts`

**Purpose**: Generates one realistic business image at a time using Google Gemini, saves it directly to `/public/` folder.

**How It Works**:
- Accepts POST requests with business details (fileName, prompt, businessName)
- Enhances the prompt with professional photography requirements
- Uses Google Gemini 2.5 Flash Image Preview model
- Generates 1 image variation (cost-effective)
- Saves directly to `/public/` folder
- Returns success status and image URL

### 2. Interactive Helper Script

**Location**: `scripts/generate-all-homepage-images.ts`

**Purpose**: Convenient batch generation with verification workflow

**Features**:
- Generates all 40 images one at a time
- Shows progress (e.g., "Generating 1/40")
- Displays generated image URL for verification
- Interactive prompts: continue (y), skip (n), or quit (q)
- Retry failed generations
- Resume capability (stop anytime, restart later)

## How to Use

### Prerequisites

1. **Install Dependencies** (if you haven't already):
```bash
npm install
```

2. **Start Development Server**:
```bash
npm run dev
```

Keep this running in one terminal.

### Option 1: Interactive Batch Generation (Recommended)

In a new terminal, run:

```bash
npm run generate-homepage-images
```

**Interactive Flow**:
```
🎨 Homepage Business Image Generator

This script will generate all 40 business images one at a time.
You can verify each image before continuing to the next one.

Make sure your dev server is running: npm run dev

Ready to start? (y/n): y

============================================================
Generating 1/40: dental-office-smile.jpg
Business: UrbanGlow Dental
============================================================

✅ Successfully generated image for UrbanGlow Dental
   View at: http://localhost:3000/dental-office-smile.jpg

Continue to next image? (y=yes, n=skip, q=quit): y
```

**What You Can Do**:
- **y** - Continue to next image
- **n** - Skip this business (generate later)
- **q** - Quit the script (resume later)
- **Retry** - If generation fails, choose 'y' to retry

**Verification Workflow**:
1. Image generates
2. Script shows URL (e.g., `http://localhost:3000/dental-office-smile.jpg`)
3. Open URL in browser to verify the image
4. If satisfied → press 'y' to continue
5. If not satisfied → restart script to regenerate that specific business

### Option 2: Manual Single Image Generation

Generate one specific image via API call:

```bash
curl -X POST http://localhost:3000/api/generate-homepage-image \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "dental-office-smile.jpg",
    "prompt": "Professional dental office with patient smiling after treatment, bright and clean, modern interior, natural lighting, professional photography",
    "businessName": "UrbanGlow Dental"
  }'
```

**Response**:
```json
{
  "success": true,
  "imageUrl": "/dental-office-smile.jpg",
  "message": "Successfully generated image for UrbanGlow Dental"
}
```

## All 40 Business Images

The script includes all 40 businesses with their complete requirements:

1. dental-office-smile.jpg - UrbanGlow Dental
2. personal-trainer-workout.jpg - PrimeFit Personal Training
3. clean-home-interior.jpg - FreshNest Cleaning Co.
4. detailed-shiny-car.jpg - SparkRide Auto Detailing
5. beautiful-landscaped-yard.jpg - Bloomfield Landscaping
6. phone-repair-service.jpg - TechRevive Phone Repair
7. beautiful-home-exterior.jpg - Maple & Stone Realtors
8. meal-prep-containers.jpg - Lifted Meals Prep Service
9. facial-treatment-spa.jpg - LuxeSkin Aesthetics
10. groomed-happy-dog.jpg - Paw Haven Grooming
... (30 more)

See `IMAGE_REQUIREMENTS.md` for complete list with descriptions.

## Image Quality Standards

All images are enhanced with these requirements:

- **Style**: Professional photography, not illustration or digital art
- **Quality**: Hyper-realistic, authentic look (no AI artifacts)
- **Lighting**: Well-lit, high-quality, suitable for advertising
- **Format**: 1080x1080px square
- **Composition**: Clean edges, professional framing
- **Purity**: No text overlays, frames, borders, watermarks, or labels
- **Purpose**: Editorial magazine quality, suitable for Facebook/Instagram ads

## Verifying Generated Images

### Method 1: Browser Verification
Open `http://localhost:3000/[filename]` to view each image.

### Method 2: Homepage Preview
Visit `http://localhost:3000` and scroll to "See What's Possible" section. The carousel will automatically display any images that exist in `/public/`.

### Method 3: File System
Check `/public/` folder directly to see generated images.

## Troubleshooting

### Issue: "Network error: fetch failed"
**Solution**: Make sure dev server is running (`npm run dev`)

### Issue: "No image was generated in the response"
**Solution**: 
- Check your Google Gemini API key is configured
- Verify AI Gateway settings in your environment
- Check console logs for detailed error messages

### Issue: Image quality doesn't match expectations
**Solution**: 
- Regenerate the specific image (run script again, it will overwrite)
- Adjust the prompt in `scripts/generate-all-homepage-images.ts`
- The prompt enhancement function ensures professional quality automatically

### Issue: Want to regenerate just one image
**Solution**: Use the manual API call method (Option 2) with the specific business details

## Cost Estimation

- **Per Image**: ~$0.02-0.10 (Google Gemini pricing)
- **40 Images**: ~$2.00 total (approximate)
- **Efficiency**: Generates only 1 variation per business (vs 3 in normal ad creation)

## After Generation Complete

Once all 40 images are in `/public/`:

1. ✅ Homepage carousel automatically displays them (no code changes needed)
2. ✅ Each mockup shows realistic business imagery
3. ✅ Visitors can see what actual services look like
4. ✅ Professional, authentic appearance

The `ad-carousel.tsx` already has `imageUrl` properties configured, so images will display automatically.

## Advanced Usage

### Regenerating Specific Images

If you want to regenerate specific images (e.g., first 10 only):

1. Edit `scripts/generate-all-homepage-images.ts`
2. Modify the `businessImages` array to include only desired businesses
3. Run `npm run generate-homepage-images`

### Customizing Prompts

Edit prompts in `scripts/generate-all-homepage-images.ts`:

```typescript
{
  fileName: 'dental-office-smile.jpg',
  businessName: 'UrbanGlow Dental',
  prompt: 'YOUR CUSTOM PROMPT HERE'  // Modify this
}
```

The enhancement function will automatically add professional quality requirements.

### Batch Processing Without Interaction

Modify the script to auto-continue:
1. Remove the interactive prompts
2. Add automatic delay between generations
3. Run unattended

## Support

If you encounter issues:
1. Check terminal logs for detailed error messages
2. Verify dev server is running
3. Confirm Google Gemini integration is working
4. Test with a single image first before batch generation

## Next Steps

After generating all images:
1. Visit homepage to see the carousel with real images
2. Share the homepage with stakeholders
3. Use same patterns for other image generation needs
4. Extend the API for additional use cases

Happy generating! 🎨

