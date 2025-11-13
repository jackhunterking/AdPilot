# Publishing System Testing Guide

## Test Environment Setup

### Prerequisites
- ✅ Database migration applied
- ✅ Supabase realtime enabled for `ads`, `ad_publishing_metadata` tables
- ✅ Meta connection configured
- ✅ Test ad account with payment method

---

## 🧪 Test Suite

### Test 1: Basic Publish Flow
**Priority:** CRITICAL

**Steps:**
1. Create a new draft ad with all required fields
2. Navigate to All Ads view
3. Click "Publish" on the ad card
4. Verify status badge changes to "Meta is Reviewing" (yellow with pulse)
5. Verify toast notification appears: "Ad submitted for review"
6. Check database: `publishing_status` should be `pending_review`

**Expected Results:**
- ✅ Status updates immediately
- ✅ Badge shows yellow with animation
- ✅ Toast notification appears
- ✅ Database reflects new status

**Pass/Fail:** ___________

---

### Test 2: Error Handling - No Meta Connection
**Priority:** HIGH

**Steps:**
1. Disconnect Meta account (or use test account without connection)
2. Try to publish an ad
3. Verify error modal appears
4. Check error message is user-friendly
5. Verify "Reconnect Meta" action is suggested

**Expected Results:**
- ✅ Error modal displays
- ✅ Error code: `token_expired`
- ✅ User message: "Please reconnect your Facebook account"
- ✅ Suggested action provided

**Pass/Fail:** ___________

---

### Test 3: Error Handling - No Payment Method
**Priority:** HIGH

**Steps:**
1. Use ad account without payment method
2. Try to publish an ad
3. Verify error modal appears
4. Check error tooltip shows info icon on ad card
5. Click info icon → Error modal should open

**Expected Results:**
- ✅ Error modal displays
- ✅ Error code: `payment_required`
- ✅ Info icon appears on ad card
- ✅ Hover tooltip shows error summary
- ✅ Click opens full error modal

**Pass/Fail:** ___________

---

### Test 4: Real-time Status Updates
**Priority:** HIGH

**Steps:**
1. Open campaign in two browser tabs (Tab A and Tab B)
2. In Tab A, publish an ad
3. Watch Tab B (do NOT refresh)
4. Status should update in Tab B within 2-3 seconds

**Expected Results:**
- ✅ Tab B receives real-time update
- ✅ No page refresh needed
- ✅ Status badge updates automatically
- ✅ Toast notification appears in both tabs

**Pass/Fail:** ___________

---

### Test 5: Status Badge Display
**Priority:** MEDIUM

**Test each status:**

| Status | Badge Color | Icon | Animation |
|--------|-------------|------|-----------|
| Draft | Gray | 📝 | None |
| Pending Review | Yellow | ⏳ | Pulse |
| Active | Green | ✅ | None |
| Failed | Red | ⚠️ | None |
| Rejected | Orange | ❌ | None |
| Paused | Orange | ⏸️ | None |
| Learning | Blue | 📊 | None |

**Pass/Fail:** ___________

---

### Test 6: Publish Button States
**Priority:** MEDIUM

**Test button adapts to status:**

| Ad Status | Button Label | Button State | Color |
|-----------|-------------|--------------|-------|
| Draft | "Publish" | Enabled | Primary |
| Pending Review | "Reviewing..." | Disabled | Secondary |
| Active | "Pause" | Enabled | Outline |
| Paused | "Resume" | Enabled | Primary |
| Failed | "Retry" | Enabled | Destructive |
| Rejected | "Fix & Republish" | Enabled | Outline |

**Pass/Fail:** ___________

---

### Test 7: Error Modal Features
**Priority:** MEDIUM

**Steps:**
1. Trigger a publishing error (no payment method)
2. Click info icon on failed ad
3. Verify error modal displays:
   - Title
   - User-friendly message
   - Technical details (collapsible)
   - Suggested action
   - Help link (if applicable)
   - "Retry" button
   - "Edit Ad" button

**Expected Results:**
- ✅ All elements display correctly
- ✅ Technical details are collapsible
- ✅ Buttons are functional
- ✅ Modal can be closed

**Pass/Fail:** ___________

---

### Test 8: Status Filtering
**Priority:** MEDIUM

**Steps:**
1. Create ads with different statuses (draft, active, paused, failed)
2. Go to All Ads view
3. Test each filter option in dropdown:
   - All Ads
   - Draft
   - Meta Reviewing
   - Live
   - Learning
   - Paused
   - Needs Changes
   - Failed

**Expected Results:**
- ✅ Each filter shows only ads with that status
- ✅ Count badges show correct numbers
- ✅ "All Ads" shows everything
- ✅ Filters with 0 ads are hidden

**Pass/Fail:** ___________

---

### Test 9: Status Transitions
**Priority:** HIGH

**Test valid transitions:**

| From | To | Trigger | Expected Result |
|------|-----|---------|----------------|
| draft | pending_review | User clicks Publish | ✅ Updates immediately |
| pending_review | active | Meta approves | ✅ Real-time update + toast |
| pending_review | rejected | Meta rejects | ✅ Real-time update + toast |
| pending_review | failed | API error | ✅ Error modal appears |
| active | paused | User clicks Pause | ✅ Shows confirmation dialog |
| paused | active | User clicks Resume | ✅ Updates immediately |
| failed | pending_review | User clicks Retry | ✅ Republishes ad |

**Pass/Fail:** ___________

---

### Test 10: Database Integrity
**Priority:** HIGH

**SQL Queries to Run:**

```sql
-- Test 1: Check status columns exist
SELECT publishing_status, meta_ad_id, last_error 
FROM ads 
LIMIT 5;

-- Test 2: Check metadata table
SELECT * FROM ad_publishing_metadata 
WHERE current_status = 'pending_review';

-- Test 3: Check status transitions are logged
SELECT * FROM ad_status_transitions 
ORDER BY transitioned_at DESC 
LIMIT 10;

-- Test 4: Check webhook events (if webhooks enabled)
SELECT * FROM meta_webhook_events 
WHERE processed = false;
```

**Expected Results:**
- ✅ All columns exist
- ✅ Metadata records exist for all ads
- ✅ Status transitions are logged
- ✅ No orphaned records

**Pass/Fail:** ___________

---

### Test 11: Toast Notifications
**Priority:** MEDIUM

**Test notifications appear for:**

| Event | Toast Type | Message |
|-------|-----------|---------|
| Publish started | Success | "Ad submitted for review" |
| Ad approved | Success | "Ad approved! Your ad is now live" |
| Ad rejected | Error | "Ad rejected - needs changes" |
| Publishing failed | Error | "Publishing failed" |
| Network error | Error | "Network error - check connection" |

**Pass/Fail:** ___________

---

### Test 12: Multi-tab Behavior
**Priority:** HIGH

**Steps:**
1. Open campaign in 3 browser tabs
2. Publish ad in Tab 1
3. Pause ad in Tab 2
4. Resume ad in Tab 3
5. Verify all tabs show correct status at each step

**Expected Results:**
- ✅ All tabs stay in sync
- ✅ No conflicts or race conditions
- ✅ Status always consistent across tabs

**Pass/Fail:** ___________

---

### Test 13: Error Recovery
**Priority:** HIGH

**Scenario A: Retry After Failure**
1. Cause publishing failure (disconnect network)
2. Click "Retry" button
3. Reconnect network
4. Verify ad publishes successfully

**Scenario B: Edit After Rejection**
1. Get ad rejected by Meta
2. Click "Edit Ad" button
3. Make changes
4. Republish
5. Verify new submission

**Pass/Fail:** ___________

---

### Test 14: Performance
**Priority:** MEDIUM

**Tests:**
1. Publish with large image (>5MB) - Should show progress
2. Real-time update latency - Should update within 3 seconds
3. Status filtering with 50+ ads - Should be instant
4. Multiple simultaneous publishes - No conflicts

**Performance Metrics:**
- Image upload: _____ seconds
- Status sync: _____ seconds
- Filter response: _____ ms
- No errors: ✅ / ❌

**Pass/Fail:** ___________

---

### Test 15: Mobile Responsiveness
**Priority:** MEDIUM

**Test on mobile viewport (375px width):**
- ✅ Status badges display correctly
- ✅ Error modals are readable
- ✅ Publish button is accessible
- ✅ Tooltips work on touch
- ✅ No horizontal scroll

**Pass/Fail:** ___________

---

## 🐛 Known Issues

Document any issues found during testing:

### Issue 1
**Severity:** ____________  
**Description:** ____________  
**Steps to Reproduce:** ____________  
**Workaround:** ____________

---

## ✅ Test Summary

**Total Tests:** 15  
**Passed:** _____  
**Failed:** _____  
**Skipped:** _____  
**Pass Rate:** _____% 

**Critical Tests Passed:** _____ / 6  
**High Priority Passed:** _____ / 5  
**Medium Priority Passed:** _____ / 4  

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] All critical tests passing (100%)
- [ ] All high priority tests passing (100%)
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors
- [ ] Database migration applied and verified
- [ ] Supabase realtime enabled
- [ ] Environment variables configured
- [ ] Error messages are user-friendly
- [ ] Toast notifications working
- [ ] Real-time updates functioning
- [ ] Status badges display correctly
- [ ] Error modals show proper information
- [ ] Publish button adapts to all statuses
- [ ] Multi-tab updates working
- [ ] Performance acceptable (<3s for updates)

---

## 🔄 Regression Testing

**Run these tests after any code changes:**

### Quick Smoke Test (5 minutes)
1. Publish a draft ad → Should show "Reviewing"
2. Check error handling → Should show modal
3. Test real-time updates → Should update across tabs

### Full Regression (30 minutes)
- Run all 15 tests above
- Verify no existing functionality broken
- Check database consistency

---

## 📞 Support & Debugging

### If Tests Fail:

1. **Check browser console** for errors
2. **Check Supabase logs** for database errors
3. **Verify realtime is enabled** in Supabase dashboard
4. **Check environment variables** are set correctly
5. **Run database verification queries** (Test 10)
6. **Clear browser cache** and retry

### Common Issues:

**Issue:** Real-time not working  
**Solution:** Enable realtime in Supabase dashboard, verify subscription in console

**Issue:** Publish button not responding  
**Solution:** Check Meta connection, verify payment method, check API logs

**Issue:** Error modal not showing  
**Solution:** Check `ad.last_error` field exists, verify error types match

---

## 📊 Test Results Log

**Date:** ___________  
**Tester:** ___________  
**Environment:** Production / Staging / Local  
**Branch:** ___________

**Results:**
- Critical: Pass ✅ / Fail ❌
- High: Pass ✅ / Fail ❌
- Medium: Pass ✅ / Fail ❌

**Notes:**
_____________________________
_____________________________
_____________________________

**Sign-off:** ___________

