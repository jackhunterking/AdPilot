# Quick Start: Testing the New Ad Creation Flow

## TL;DR - What Changed

**Before:** "create an ad" → generates images immediately → stays in All Ads view (broken)

**After:** "create an ad" → confirmation dialog → Ad Builder opens → AI asks about images → generates 3 variations

## 5-Minute Test

### Test 1: Basic Flow (2 minutes)
```
1. Go to any campaign → All Ads view
2. Type in AI Chat: "create an ad for me"
3. Click "Confirm" in dialog
4. ✅ Should see Ad Builder open (right side)
5. ✅ URL should have: ?view=build&adId=xxx&step=creative
6. Type: "yes" to generate images
7. ✅ Should see 3 images appear in Ad Builder
8. ✅ Success message: "✨ 3 creative variations generated!"
```

### Test 2: Cancellation (30 seconds)
```
1. Type: "create an ad"
2. Click "Cancel" in dialog
3. ✅ Nothing happens, stay in All Ads view
4. ✅ No error messages
```

### Test 3: Page Refresh (30 seconds)
```
1. After generating images, refresh the page
2. ✅ Ad Builder should reopen with same ad
3. ✅ Images should still be visible
```

## What to Look For

### ✅ Good Signs
- Confirmation dialog appears before creating ad
- URL has `view=build` parameter
- Right side shows "Ad Builder" not "All Ads"
- Success messages are clear and helpful
- Only 1 ad created (not 3)

### ❌ Red Flags
- Stays in All Ads view after confirmation
- Shows "2 Variations Created!" (old message)
- Creates 3 separate ads instead of 3 variations
- No confirmation dialog appears
- Error: "No ad draft found"

## Quick Troubleshooting

**Issue: Stays in All Ads view**
→ Check URL for `view=build` parameter

**Issue: "No ad draft found" error**
→ Verify confirmation dialog appeared and was confirmed

**Issue: Old "2 Variations" message**
→ Clear cache and rebuild

## Files to Review if Issues Found

1. Browser console (F12) for errors
2. Network tab for failed API calls
3. URL parameters (should have `view=build&adId=xxx`)
4. Database ads table (should have ONE draft ad)

## Full Documentation

- **Testing Guide:** `AD_CREATION_FLOW_TESTING_GUIDE.md`
- **Technical Details:** `IMPLEMENTATION_SUMMARY.md`
- **Status:** `AD_CREATION_FLOW_IMPLEMENTATION_COMPLETE.md`

---

**Ready to test!** Start with Test 1 above. If that works, you're good to go! 🚀

