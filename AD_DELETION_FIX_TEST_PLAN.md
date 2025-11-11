# Ad Deletion Persistence Fix - Testing Plan

## Overview
This document provides a comprehensive testing plan for the ad deletion persistence fix. The fix addresses the issue where deleted ads reappear after the sequence: Delete → New Ad → Cancel → Refresh.

## Test Environment Setup
1. Ensure you have at least 3-4 test ads in a campaign
2. Open browser DevTools (Network and Console tabs)
3. Have the application running locally
4. Clear browser cache before starting tests

## Critical Test Cases

### Test 1: Basic Delete
**Steps:**
1. Navigate to "View All Ads" screen
2. Click delete button on any ad
3. Observe the UI update (ad should disappear immediately)
4. Check console logs for successful deletion
5. Verify network request shows 200 OK and returns deletedAd data

**Expected Results:**
- ✅ Toast shows "Deleting ad..."
- ✅ Toast shows "Ad deleted successfully"
- ✅ Ad disappears from grid immediately
- ✅ Console shows successful deletion with trace ID
- ✅ Network shows DELETE request succeeded

**Pass Criteria:** Ad is gone and doesn't reappear

---

### Test 2: Delete + Page Refresh (Primary Bug Fix)
**Steps:**
1. Delete an ad (should disappear)
2. Wait 2 seconds
3. Refresh the browser page (F5 or Cmd+R)
4. Wait for ads to load
5. Verify the deleted ad is NOT in the list

**Expected Results:**
- ✅ After refresh, deleted ad stays gone
- ✅ Other ads still appear correctly
- ✅ No console errors
- ✅ Network request fetches updated ad list

**Pass Criteria:** Deleted ad never reappears

---

### Test 3: Delete + New Ad + Cancel + Refresh (Main Bug Scenario)
**Steps:**
1. Delete an ad (note which one)
2. Click "New Ad" button
3. Immediately click Back/Cancel button
4. Observe draft cleanup in console
5. Refresh the page
6. Verify the originally deleted ad is NOT in the list

**Expected Results:**
- ✅ Draft ad is created successfully
- ✅ Draft ad is cleaned up when canceled
- ✅ Console shows draft deletion trace
- ✅ After refresh, originally deleted ad stays gone
- ✅ Draft ad is also gone (cleaned up)

**Pass Criteria:** Both deleted and draft ads stay gone

---

### Test 4: Multiple Rapid Deletes
**Steps:**
1. Click delete on 3 different ads rapidly (within 2 seconds)
2. Observe the toasts and UI updates
3. Wait for all deletions to complete
4. Refresh the page
5. Verify all 3 ads are gone

**Expected Results:**
- ✅ Each delete shows loading toast
- ✅ Toasts show "Delete already in progress" if clicked too fast (operation locking)
- ✅ All ads disappear from UI
- ✅ Console shows all deletions completed
- ✅ After refresh, all 3 ads stay gone

**Pass Criteria:** All deleted ads stay gone, no race conditions

---

### Test 5: Delete While Offline
**Steps:**
1. Open DevTools > Network tab
2. Enable "Offline" mode in DevTools
3. Try to delete an ad
4. Observe error handling
5. Go back online
6. Refresh the page
7. Verify ad is still present (delete failed gracefully)

**Expected Results:**
- ✅ Toast shows "Network error - check your connection"
- ✅ Ad remains in UI (delete didn't succeed)
- ✅ Console logs network error
- ✅ After going online and refreshing, ad is still there

**Pass Criteria:** Graceful failure, no state corruption

---

### Test 6: Delete Non-Existent Ad
**Steps:**
1. Delete an ad
2. Open DevTools Console
3. Manually call the delete API with the same ad ID again:
   ```javascript
   fetch('/api/campaigns/YOUR_CAMPAIGN_ID/ads/DELETED_AD_ID', { method: 'DELETE' })
     .then(r => r.json())
     .then(console.log)
   ```
4. Observe the response

**Expected Results:**
- ✅ API returns 404 status
- ✅ Response body: `{ error: "Ad not found - it may have already been deleted" }`
- ✅ Operation is idempotent (safe to call multiple times)

**Pass Criteria:** 404 response, no errors, idempotent behavior

---

### Test 7: Create Draft Then Immediately Delete
**Steps:**
1. Click "New Ad"
2. Wait for draft to be created (toast: "New ad created")
3. Immediately click Back button
4. Confirm cancellation in dialog
5. Observe console logs for draft cleanup
6. Refresh page
7. Verify draft ad is gone

**Expected Results:**
- ✅ Draft created successfully
- ✅ Cancel dialog shows
- ✅ Console shows draft deletion trace
- ✅ Toast may show operation feedback
- ✅ After refresh, draft is gone

**Pass Criteria:** Draft is properly cleaned up

---

### Test 8: Concurrent New Ad Clicks (Operation Locking)
**Steps:**
1. Click "New Ad" button
2. Immediately click "New Ad" button again (before first completes)
3. Observe the behavior

**Expected Results:**
- ✅ First click starts creating ad
- ✅ Second click shows toast: "Already creating an ad - please wait"
- ✅ Only ONE draft ad is created
- ✅ Console shows lock acquisition/release
- ✅ No duplicate drafts

**Pass Criteria:** Operation locking prevents duplicate drafts

---

### Test 9: Delete Published Ad
**Steps:**
1. Find an ad with status "Active" or "Paused" (has meta_ad_id)
2. Delete the ad
3. Observe behavior
4. Refresh page
5. Verify ad is gone

**Expected Results:**
- ✅ Delete succeeds even for published ads
- ✅ Console logs show "hasMetaId: true"
- ✅ Ad disappears from UI
- ✅ After refresh, ad stays gone

**Pass Criteria:** Published ads can be deleted

---

### Test 10: Delete + Navigate Away + Return
**Steps:**
1. Delete an ad
2. Click on campaign name to go to homepage
3. Click back to return to the campaign
4. Observe the ads list

**Expected Results:**
- ✅ Ad stays deleted
- ✅ Ads list loads without deleted ad
- ✅ No console errors

**Pass Criteria:** State persists across navigation

---

## Edge Case Tests

### Edge 1: Very Slow Network (3G Simulation)
**Steps:**
1. Enable 3G throttling in DevTools
2. Delete an ad
3. Observe the loading indicators
4. Wait for operation to complete

**Expected Results:**
- ✅ Loading toast stays visible during slow request
- ✅ Delete eventually succeeds
- ✅ UI updates after success
- ✅ No timeout errors

---

### Edge 2: Server Returns 500 Error
**Steps:**
1. Modify API to temporarily return 500 (or use network interception)
2. Try to delete an ad
3. Observe error handling

**Expected Results:**
- ✅ Toast shows "Failed to delete ad from database"
- ✅ Ad remains in UI (delete didn't succeed)
- ✅ Console logs detailed error
- ✅ User can retry

---

### Edge 3: RLS Policy Blocks Delete
**Steps:**
1. Attempt to delete an ad from a campaign user doesn't own (if possible)
2. Observe the response

**Expected Results:**
- ✅ API returns 404 or 403
- ✅ Toast shows appropriate error
- ✅ Console logs permission issue

---

## Verification Checklist

After all tests, verify:

- [ ] No ads reappear after being deleted
- [ ] Draft ads are properly cleaned up on cancel
- [ ] No console errors during normal operations
- [ ] All toasts display appropriately
- [ ] Network requests show correct status codes
- [ ] Database state matches UI state (check Supabase dashboard)
- [ ] Operation locking prevents race conditions
- [ ] Graceful error handling for all failure modes

## Console Log Verification

Look for these log patterns:

**Successful Delete:**
```
[delete_ad_workspace_XXXXX] Delete ad initiated
[delete_ad_XXXXX] Delete operation started
[delete_ad_XXXXX] Ad found, proceeding with deletion
[delete_ad_XXXXX] Ad deleted and verified successfully
[fetch_ads_XXXXX] fetchAds success
```

**Draft Creation:**
```
[draft_create_XXXXX] Draft ad creation started
[draft_create_XXXXX] Draft ad created successfully
```

**Draft Cleanup:**
```
[cancel_draft_XXXXX] Attempting to delete draft ad
[cancel_draft_XXXXX] Draft ad deleted or already gone
[cancel_draft_XXXXX] Ads list refreshed after draft cleanup
```

## Success Metrics

The fix is successful if:
1. ✅ Test 3 (main bug scenario) passes 100% of the time
2. ✅ All critical tests (1-10) pass
3. ✅ No ads reappear after deletion in any scenario
4. ✅ No console errors during normal operations
5. ✅ User experience is smooth with proper feedback

## Reporting Issues

If any test fails, document:
1. Test case number and name
2. Steps to reproduce
3. Expected vs actual results
4. Console logs (full trace)
5. Network tab screenshot
6. Browser and OS version

## Next Steps After Testing

If all tests pass:
- ✅ Mark implementation as complete
- ✅ Deploy to staging for QA
- ✅ Monitor production logs for ad deletion patterns
- ✅ Document fix in release notes

If tests fail:
- Identify root cause from logs
- Fix the issue
- Re-run all tests
- Update fix documentation

