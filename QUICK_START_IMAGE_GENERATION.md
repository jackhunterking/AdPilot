# Quick Start: Generate Homepage Business Images

## TL;DR

Generate all 40 realistic business images for your homepage mockups in 3 steps:

### Step 1: Start Dev Server
```bash
npm run dev
```

Keep this running.

### Step 2: Generate Images (New Terminal)
```bash
npm run generate-homepage-images
```

### Step 3: Follow Prompts
- Press `y` to start
- View each generated image at the displayed URL
- Press `y` to continue to next, `n` to skip, `q` to quit
- Images save directly to `/public/` folder

## What Gets Generated

40 professional business images:
- UrbanGlow Dental → Professional dental office
- SparkRide Auto Detailing → Shiny detailed car
- Bloomfield Landscaping → Beautiful landscaped yard
- ... (37 more)

Each image is:
- ✅ Professional quality photography
- ✅ Realistic (no AI artifacts)
- ✅ 1080x1080px square format
- ✅ Ready for Facebook/Instagram ads
- ✅ Saved as `/public/[filename].jpg`

## After Generation

Visit `http://localhost:3000` and scroll to the homepage carousel. Your mockups will automatically show the real business images!

## Cost

~$2.00 total for all 40 images (Google Gemini pricing)

## Need Help?

See `HOMEPAGE_IMAGE_GENERATION_GUIDE.md` for detailed instructions, troubleshooting, and advanced usage.

## Manual Single Image

Generate one specific image:

```bash
curl -X POST http://localhost:3000/api/generate-homepage-image \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "dental-office-smile.jpg",
    "prompt": "Professional dental office with patient smiling",
    "businessName": "UrbanGlow Dental"
  }'
```

That's it! 🚀

