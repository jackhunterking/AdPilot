# Testing Guide: Draft Ad Flow & Image Generation

## Purpose
Verify that the complete user journey from homepage to image generation works correctly after implementing the fixes.

## Prerequisites

### 1. Verify Code Changes
- ✅ `lib/hooks/use-campaign-ads.ts` - API response parsing fixed (4 locations)
- ✅ `components/ai-chat.tsx` - Fallback ad creation added to `handleImageGeneration`
- ✅ `app/api/v1/campaigns/route.ts` - Enhanced error logging added

### 2. Verify RLS Policies
- ✅ Follow `RLS_VERIFICATION_GUIDE.md` to ensure all policies exist
- ✅ Confirm `ads` table has RLS enabled with INSERT policy

### 3. Deploy Changes
```bash
# Build and verify no errors
npm run build

# If local testing:
npm run dev

# If testing on staging:
git add .
git commit -m "fix: resolve draft ad creation and image generation flow"
git push origin new-flow
```

## Test Cases

### Test Case 1: New User Campaign Creation (Happy Path)

**Steps:**
1. Open browser in incognito/private mode
2. Navigate to homepage (e.g., `https://staging.adpilot.studio`)
3. Select goal type: "Leads"
4. Enter prompt: "I am a real estate broker looking to get leads for pre-construction condo sales"
5. Click submit
6. Sign up with new email or log in with existing account
7. Complete authentication

**Expected Results:**

**✅ Console Logs (in order):**
```
[POST /api/campaigns] Creating initial draft ad for campaign [UUID]
[POST /api/campaigns] ✅ Created initial draft ad [AD-UUID] for campaign [CAMPAIGN-UUID]
[POST /api/campaigns] Final response - campaignId: [UUID], draftAdId: [AD-UUID]
[fetch_ads_xxx] fetchAds success: { campaignId: [UUID], adCount: 1, duration: "XXms" }
```

**✅ URL:**
```
https://staging.adpilot.studio/[campaign-id]?view=build&adId=[ad-id]&firstVisit=true
```

**✅ UI State:**
- Right panel shows "Creative" step active
- No "No ads yet" message
- Chat shows initial prompt auto-submitted
- AI responds with creative suggestions

**❌ Should NOT see:**
- "Response missing ads array" warning
- Empty ads list in console
- "No ad draft found" error

### Test Case 2: Image Generation After Campaign Creation

**Steps:**
1. Continue from Test Case 1
2. Wait for AI to offer "Generate this ad?"
3. Review the generated prompt (should describe real estate/condo sales)
4. Click "Generate" button

**Expected Results:**

**✅ Console Logs:**
```
[AIChat] ✅ Generated 3 creative variations for ad: [ad-id]
[fetch_ads_xxx] fetchAds success: { campaignId: [UUID], adCount: 1, duration: "XXms" }
```

**✅ UI State:**
- Loading animation appears: "Generating 3 AI-powered creative variations..."
- After ~10-30 seconds, 3 images appear in the preview panel
- Success message: "✨ 3 creative variations generated!"
- Images are clickable/selectable

**❌ Should NOT see:**
- "No ad draft found. Please create an ad first."
- "Failed to create ad draft"
- Any Supabase permission errors

### Test Case 3: Image Generation Fallback (Missing adId)

**Purpose:** Test that fallback ad creation works if URL doesn't have adId

**Steps:**
1. Create a campaign normally (Test Case 1)
2. After campaign is created, manually modify URL to remove `adId` parameter
   - From: `/[campaign-id]?view=build&adId=[ad-id]`
   - To: `/[campaign-id]`
3. In chat, type: "Generate creative images for this campaign"
4. Wait for AI to trigger image generation
5. Click "Generate" when prompted

**Expected Results:**

**✅ Console Logs:**
```
[AIChat] No adId in URL, creating draft ad...
[AIChat] ✅ Created draft ad: [new-ad-id]
[AIChat] ✅ Generated 3 creative variations for ad: [new-ad-id]
```

**✅ URL (after generation):**
```
/[campaign-id]?view=build&adId=[new-ad-id]&step=creative
```

**✅ UI State:**
- Ad is created automatically
- URL is updated with new adId
- Images generate successfully
- No error messages

**❌ Should NOT see:**
- "No ad draft found" error stopping the flow
- Generation failing due to missing adId

### Test Case 4: Existing User - Create Additional Campaign

**Steps:**
1. Log in with existing account that already has campaigns
2. Go to homepage
3. Create a new campaign with different prompt
4. Verify draft ad is created
5. Generate images

**Expected Results:**
- Same as Test Case 1 & 2
- Multiple campaigns should coexist without issues
- Each campaign should have its own draft ad

### Test Case 5: API Response Validation

**Purpose:** Verify API responses are now correctly parsed

**Steps:**
1. Open browser DevTools → Network tab
2. Create a new campaign
3. Find the request to `/api/v1/ads?campaignId=[id]`
4. Inspect the response

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "...",
        "campaign_id": "...",
        "name": "Campaign Name - Draft",
        "status": "draft",
        "meta_ad_id": null,
        "setup_snapshot": { ... },
        "created_at": "...",
        "updated_at": "..."
      }
    ]
  }
}
```

**✅ Verify:**
- Response has `success: true`
- Data is wrapped in `data` object
- `data.ads` is an array
- Array contains at least 1 draft ad

## Troubleshooting

### Issue: "Response missing ads array"

**Cause:** API response parsing bug (should be fixed now)
**Check:**
```javascript
// In use-campaign-ads.ts, line ~112
if (!response.data || !Array.isArray(response.data.ads)) {  // ✅ Should access response.data.ads
```

**Fix:** Verify code changes are deployed

### Issue: Draft ad not created

**Symptoms:**
- Console shows: `draftAdId: 'NONE'`
- Supabase error code 42501

**Causes:**
1. RLS policies missing → See `RLS_VERIFICATION_GUIDE.md`
2. Database connection issue → Check Supabase status

**Verification:**
- Check Supabase Dashboard → Table Editor → `ads` table
- Verify draft ad exists with correct campaign_id

### Issue: Image generation fails

**Symptoms:**
- "Failed to create ad draft" error
- Images don't generate

**Causes:**
1. No adId in URL and fallback failed
2. API `/api/v1/ads` endpoint failing

**Verification:**
- Check console for detailed error logs
- Verify `/api/v1/ads` POST endpoint works in Network tab
- Test manually with curl:
```bash
curl -X POST https://staging.adpilot.studio/api/v1/ads \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"[your-campaign-id]","name":"Test Ad","status":"draft"}'
```

## Success Criteria

All test cases pass with:
- ✅ No console errors
- ✅ Draft ads created automatically
- ✅ URL contains adId parameter
- ✅ Images generate successfully
- ✅ UI shows creative builder (not "No ads yet")
- ✅ Fallback ad creation works when needed

## Rollback Plan

If critical issues are found:

```bash
# Revert the changes
git revert HEAD

# Or restore specific files:
git checkout HEAD~1 lib/hooks/use-campaign-ads.ts
git checkout HEAD~1 components/ai-chat.tsx
git checkout HEAD~1 app/api/v1/campaigns/route.ts
```

## Next Steps After Testing

Once all tests pass:
1. Monitor production logs for 24 hours
2. Check for any Sentry errors related to ad creation
3. Verify analytics show increased successful campaign creations
4. Gather user feedback on improved onboarding flow

## Related Files
- `/lib/hooks/use-campaign-ads.ts` - API response parsing
- `/components/ai-chat.tsx` - Fallback ad creation
- `/app/api/v1/campaigns/route.ts` - Enhanced logging
- `/RLS_VERIFICATION_GUIDE.md` - Database policies
- `/fix-draft-ad-flow.plan.md` - Original plan

