# Ad Creation Flow Testing Guide

## Overview
This guide covers testing the refactored ad creation flow that separates ad creation from image generation.

## Prerequisites
1. Staging environment running on `localhost:3000`
2. User account with at least one campaign created
3. Campaign should have Meta connection set up
4. Browser DevTools open to monitor console logs and network requests

## Test Scenarios

### Scenario 1: Create New Ad from All Ads View (Happy Path)

**Starting State:** All Ads view (empty or with existing ads)

**Steps:**
1. Navigate to a campaign
2. Ensure you're in "All Ads" view (right side shows grid or "No ads yet")
3. In AI Chat (left side), type: "create an ad for me"
4. Press Enter

**Expected Results:**
- ✅ AI responds with text acknowledging the request
- ✅ `createAd` tool is called (check DevTools console for `[AIChat] tool-createAd`)
- ✅ Confirmation dialog appears with:
  - Title: "Create New Ad?"
  - Message: "This will open Ad Builder and create a new ad draft..."
  - Two buttons: "Cancel" and "Confirm"

5. Click **Confirm** button

**Expected Results:**
- ✅ Loading indicator appears briefly
- ✅ API call to `/api/campaigns/[campaignId]/ads/draft` succeeds (201 status)
- ✅ URL updates to: `/${campaignId}?view=build&adId=[UUID]&step=creative`
- ✅ Right side switches from "All Ads" to "Ad Builder" canvas
- ✅ Ad Builder shows Step 1: Creative (empty state)
- ✅ Success message appears in chat: "Ad Builder opened - start with Step 1: Creative"
- ✅ AI asks: "Would you like me to generate images for your ad?"

6. Type: "yes" and press Enter

**Expected Results:**
- ✅ AI calls `generateImage` tool
- ✅ Image generation confirmation dialog appears
- ✅ User can edit prompt or confirm

7. Click **Generate** in the confirmation dialog

**Expected Results:**
- ✅ Loading animation appears: "Generating 3 AI-powered creative variations..."
- ✅ 3 images are generated and appear in the Creative step canvas
- ✅ Success message in chat: "✨ 3 creative variations generated! Pick your favorite on the canvas →"
- ✅ Images are visible on the right side in Ad Builder
- ✅ User can click to select an image
- ✅ URL remains: `/${campaignId}?view=build&adId=[UUID]&step=creative`

### Scenario 2: Cancel Ad Creation

**Starting State:** All Ads view

**Steps:**
1. Type in AI Chat: "create an ad for me"
2. Confirmation dialog appears
3. Click **Cancel** button

**Expected Results:**
- ✅ Dialog closes
- ✅ No API call to create draft ad
- ✅ Stay in All Ads view (no navigation)
- ✅ AI responds: "No problem! Let me know when you're ready..."
- ✅ No success message or error

### Scenario 3: Create New Ad While Already in Builder (Unsaved Changes Warning)

**Starting State:** Ad Builder with an ad being edited

**Steps:**
1. Navigate to Ad Builder with an existing ad: `/${campaignId}?view=build&adId=[existingAdId]`
2. Make some changes (e.g., select an image)
3. In AI Chat, type: "create a new ad"
4. Press Enter

**Expected Results:**
- ✅ Confirmation dialog appears with **WARNING variant** (orange icon)
- ✅ Message mentions: "Any unsaved changes will be lost"
- ✅ User must explicitly confirm

5. Click **Confirm**

**Expected Results:**
- ✅ New draft ad created
- ✅ URL updates to new ad: `/${campaignId}?view=build&adId=[newUUID]&step=creative`
- ✅ Ad Builder resets to Step 1 with empty state
- ✅ Previous ad is NOT affected (still in draft state in database)

### Scenario 4: Page Refresh During Ad Creation

**Starting State:** Ad Builder after generating images

**Steps:**
1. Complete Scenario 1 up to step 7 (images generated)
2. Note the current URL with adId
3. Refresh the page (Cmd+R or F5)

**Expected Results:**
- ✅ Page reloads
- ✅ Ad Builder reopens (not All Ads view)
- ✅ Same ad is shown with same adId in URL
- ✅ Generated images are still visible
- ✅ AI Chat history may reset (acceptable)
- ✅ Draft ad persists in database

### Scenario 5: Generate Images Without Creating Ad First (Error Handling)

**Starting State:** All Ads view (NOT in builder)

**Steps:**
1. In AI Chat, type: "generate an image with a car"
2. Press Enter

**Expected Results:**
- ✅ AI should first call `createAd` tool (not `generateImage` directly)
- ✅ Confirmation dialog appears
- ✅ Only after confirmation and navigation to builder, AI asks about images

**Alternative (if AI incorrectly calls generateImage directly):**
- ✅ Error should appear: "No ad draft found. Please create an ad first."
- ✅ User is prompted to create an ad first

### Scenario 6: Multiple Variations in One Ad

**Starting State:** Ad Builder with 3 generated images

**Steps:**
1. Complete Scenario 1 fully
2. Verify that the Creative step shows 3 different image variations
3. Click on different variations to select them

**Expected Results:**
- ✅ All 3 variations belong to the SAME ad (same adId in URL)
- ✅ Only ONE ad appears in All Ads grid when navigating back
- ✅ Variations are choices, not separate ads
- ✅ User can select one variation as the primary image

## Console Logging Verification

Check browser console for these log messages:

### When createAd Tool is Called:
```
[AIChat] tool-createAd
```

### When Draft Ad is Created:
```
POST /api/campaigns/[campaignId]/ads/draft
[draft_create_XXXXX] Draft ad creation started
[draft_create_XXXXX] Draft ad created successfully
```

### When Images are Generated:
```
[AIChat] ✅ Generated 3 creative variations for ad: [adId]
POST /api/campaigns/[campaignId]/ads/[adId]/snapshot
```

## Database Verification

After completing Scenario 1, verify in Supabase:

1. **ads table:**
   - ✅ One new row with status='draft'
   - ✅ `id` matches URL adId parameter
   - ✅ `campaign_id` matches campaign
   - ✅ `name` includes "Draft" and timestamp
   - ✅ `setup_snapshot` contains creative data with 3 imageVariations

2. **No separate rows for variations:**
   - ✅ Only ONE ad row exists (not 3 rows)
   - ✅ Variations are stored in `setup_snapshot.creative.imageVariations` array

## Common Issues & Troubleshooting

### Issue: Stays in All Ads view after confirmation
**Check:**
- URL should have `view=build` parameter
- Console shows successful navigation
- Campaign workspace `effectiveMode` should be 'build'

### Issue: "No ad draft found" error during image generation
**Check:**
- URL has `adId` parameter
- AI called `createAd` tool before `generateImage`
- Draft ad exists in database

### Issue: Shows "2 Variations Created!" instead of "3 creative variations"
**Check:**
- This was the OLD message - should not appear anymore
- Verify you're testing the latest code

### Issue: Creates 3 separate ads instead of 3 variations
**Check:**
- Database should have only 1 ad row
- The ad's `setup_snapshot.creative.imageVariations` should be an array with 3 URLs
- All Ads grid should show only 1 ad card

## Success Criteria Summary

✅ Confirmation dialog appears before ad creation
✅ User can cancel without side effects
✅ Navigation includes `view=build&adId=UUID&step=creative`
✅ Right side switches from All Ads → Ad Builder
✅ Success message: "Ad Builder opened - start with Step 1: Creative"
✅ AI asks about image generation separately
✅ Success message: "✨ 3 creative variations generated!"
✅ 3 variations stored in ONE ad (not 3 separate ads)
✅ URL persists through page refresh
✅ Builder maintains state after refresh

## Reporting Issues

If any test fails, capture:
1. Screenshot of the UI state
2. Console logs (errors and relevant info logs)
3. Network tab (failed requests)
4. Current URL
5. Expected behavior vs actual behavior

