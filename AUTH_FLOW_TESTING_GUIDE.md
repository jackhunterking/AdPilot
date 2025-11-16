# Authentication Flow Testing Guide

**Date**: November 16, 2025  
**Status**: Implementation Complete - Ready for Testing

---

## Overview

This guide provides step-by-step testing instructions for all authentication and campaign creation flows after the architectural fixes.

## What Was Fixed

### Core Improvements

1. **PostAuthHandler Service** - Unified service for all post-auth campaign creation
2. **Proper State Management** - Loading → Creating → Success/Error states with user feedback
3. **Client-Side Navigation** - Using `router.push()` after confirmed success (not `router.replace()`)
4. **Campaign Verification** - Verifies campaign exists before redirecting
5. **Email Sign-In Handler** - Now checks for temp prompt and processes it
6. **Better Error Handling** - User-friendly error pages with recovery options
7. **Toast Notifications** - Success/error feedback across all flows

### Key Changes

- **Before**: `router.replace()` happened immediately → race condition
- **After**: Wait for campaign creation, verify it exists, then navigate

---

## Test Scenarios

### Scenario 1: OAuth Sign-In (With Temp Prompt) ✅ P0

**Steps:**
1. Navigate to homepage (not logged in)
2. Enter business description in prompt input
3. Select a goal (Leads/Calls/Website Visits)
4. Click Send button
5. Click "Continue with Google" in auth modal
6. Complete Google OAuth flow
7. Observe redirect to `/auth/post-login`

**Expected Results:**
- ✅ Shows "Creating your campaign…" loading state
- ✅ Campaign is created successfully
- ✅ Shows green success checkmark
- ✅ Toast notification: "Campaign created successfully!"
- ✅ Redirects to `/${campaignId}` after 500ms
- ✅ Campaign page loads without "Campaign Not Found" error
- ✅ AI chat shows initial prompt in conversation
- ✅ Console shows detailed logging

**Console Logs to Verify:**
```
[PostAuthHandler] Found temp prompt in localStorage: <uuid>
[PostAuthHandler] Processing temp prompt: <uuid>
[PostAuthHandler] Campaign created: <uuid>
[PostAuthHandler] Campaign verified and ready
[POST-LOGIN] Campaign created successfully: <uuid>
[POST-LOGIN] Navigating to campaign: <uuid>
[SERVER] Campaign loaded successfully: { id, name, adsCount, ... }
```

---

### Scenario 2: OAuth Sign-In (No Temp Prompt) ✅ P1

**Steps:**
1. Navigate to homepage (not logged in)
2. Click "Sign In" button
3. Click "Continue with Google"
4. Complete Google OAuth flow

**Expected Results:**
- ✅ Redirects to `/auth/post-login`
- ✅ Shows "Redirecting to homepage…"
- ✅ Redirects to homepage after 1 second
- ✅ No campaign is created
- ✅ No errors shown

**Console Logs to Verify:**
```
[PostAuthHandler] No temp prompt found
[POST-LOGIN] No temp prompt found, redirecting to homepage
```

---

### Scenario 3: Email Sign-Up (With Temp Prompt) ✅ P0

**Steps:**
1. Navigate to homepage (not logged in)
2. Enter business description in prompt input
3. Click Send button
4. Click "Sign Up" tab in auth modal
5. Enter email, password, confirm password
6. Click "Create Account"
7. Check email inbox
8. Click verification link
9. Browser redirects to `/?verified=true`
10. Observe redirect to `/auth/post-verify`

**Expected Results:**
- ✅ Shows "Creating your campaign…" loading state
- ✅ Campaign is created successfully
- ✅ Toast notification: "Campaign created successfully!"
- ✅ Redirects to `/${campaignId}`
- ✅ Campaign page loads successfully
- ✅ Temp prompt is cleared from localStorage

**Console Logs to Verify:**
```
[PostAuthHandler] Found temp prompt in user metadata: <uuid>
[POST-VERIFY] Campaign created successfully: <uuid>
[SERVER] Campaign loaded successfully
```

---

### Scenario 4: Email Sign-In (With Temp Prompt) ✅ P0

**Steps:**
1. Navigate to homepage (not logged in)
2. Enter business description in prompt input
3. Click Send button
4. Click "Sign In" tab in auth modal
5. Enter existing account email and password
6. Click "Sign In"

**Expected Results:**
- ✅ Console log: "[SIGN-IN] Temp prompt found, redirecting to post-login handler"
- ✅ Redirects to `/auth/post-login` (NOT closing modal)
- ✅ Shows "Creating your campaign…" loading state
- ✅ Campaign is created successfully
- ✅ Toast notification: "Campaign created successfully!"
- ✅ Redirects to `/${campaignId}`
- ✅ Campaign page loads successfully

**Console Logs to Verify:**
```
[SIGN-IN] Temp prompt found, redirecting to post-login handler
[POST-LOGIN] Starting post-login flow
[PostAuthHandler] Found temp prompt in localStorage: <uuid>
[POST-LOGIN] Campaign created successfully: <uuid>
```

---

### Scenario 5: Email Sign-In (No Temp Prompt) ✅ P1

**Steps:**
1. Navigate to homepage (not logged in)
2. Click "Sign In" button
3. Enter email and password
4. Click "Sign In"

**Expected Results:**
- ✅ Auth modal closes
- ✅ User stays on homepage
- ✅ Homepage shows logged-in header
- ✅ No campaign is created
- ✅ No redirect occurs

---

### Scenario 6: Authenticated User Creates Campaign ✅ P0

**Steps:**
1. Already logged in
2. Enter business description in prompt input
3. Click Send button

**Expected Results:**
- ✅ Campaign is created immediately (no auth modal)
- ✅ Redirects to `/${campaignId}?view=build&adId=${draftAd.id}&firstVisit=true`
- ✅ Campaign page loads successfully
- ✅ Draft ad is available
- ✅ No temp prompt involved

**Console Logs to Verify:**
```
[CampaignContext] Created campaign <uuid>
[SERVER] Campaign loaded successfully
```

---

## Edge Case Testing

### Edge Case 1: Expired Temp Prompt ⚠️ P2

**Steps:**
1. Create temp prompt
2. Wait 31+ minutes (or manually update `expires_at` in database to past date)
3. Complete authentication flow

**Expected Results:**
- ✅ Error toast: "Failed to create campaign"
- ✅ Description: "Your session expired. Please submit your prompt again."
- ✅ Error page shows with "Back to Homepage" button
- ✅ No campaign is created

---

### Edge Case 2: Browser Back Button ⚠️ P2

**Steps:**
1. Complete OAuth flow successfully
2. Campaign page loads
3. Click browser back button

**Expected Results:**
- ✅ Does NOT recreate campaign (sessionStorage sentinel prevents double-processing)
- ✅ Redirects to homepage gracefully
- ✅ No errors shown

---

### Edge Case 3: Page Refresh During Auth ⚠️ P2

**Steps:**
1. Start OAuth flow
2. Refresh page while on `/auth/post-login`

**Expected Results:**
- ✅ Handles gracefully
- ✅ Either completes campaign creation or redirects home
- ✅ No infinite loops or crashes

---

### Edge Case 4: Network Timeout ⚠️ P2

**Steps:**
1. Simulate slow/failing API by throttling network
2. Complete auth flow

**Expected Results:**
- ✅ Shows loading state while waiting
- ✅ Eventually shows error if timeout occurs
- ✅ Error page with "Try Again" button
- ✅ Retry button works

---

### Edge Case 5: Campaign Creation Fails ⚠️ P2

**Steps:**
1. Manually cause campaign creation to fail (e.g., invalid temp prompt ID)
2. Complete auth flow

**Expected Results:**
- ✅ Error toast shows
- ✅ Error page displays with error message
- ✅ "Back to Homepage" button works
- ✅ "Try Again" button reloads page

---

## Verification Checklist

### Pre-Flight Checks
- [ ] `lib/services/post-auth-handler.ts` exists
- [ ] Post-login and post-verify pages use `PostAuthHandler`
- [ ] Email sign-in form checks for temp prompt
- [ ] Campaign page has better error logging
- [ ] Not-found page exists at `app/[campaignId]/not-found.tsx`
- [ ] Toaster is configured in `app/layout.tsx`

### Code Quality Checks
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No linting errors (`npm run lint`)
- [ ] All console.logs are present for debugging
- [ ] Error messages are user-friendly

### Functional Tests (Manual)
- [ ] OAuth with temp prompt creates campaign ✅
- [ ] OAuth without temp prompt redirects home ✅
- [ ] Email signup with temp prompt creates campaign ✅
- [ ] Email signin with temp prompt creates campaign ✅
- [ ] Email signin without temp prompt closes modal ✅
- [ ] Authenticated user can create campaign directly ✅

### Performance Tests
- [ ] Campaign creation completes in < 5 seconds
- [ ] No "Campaign Not Found" errors after successful creation
- [ ] Page loads smoothly without infinite redirects
- [ ] Toast notifications appear and dismiss properly

### Error Handling Tests
- [ ] Expired temp prompts show clear error message
- [ ] Network failures show error page with retry
- [ ] Invalid campaign IDs show not-found page
- [ ] Browser back button handled gracefully

---

## Testing Tools

### Browser DevTools
- **Console**: Watch for detailed logs at each step
- **Network**: Verify API calls complete successfully
- **Application → Storage**: Check localStorage for temp_prompt_id
- **Application → Session Storage**: Verify sentinel keys work

### Vercel Logs (Production)
- Monitor for errors after deployment
- Watch for "Campaign not found" errors
- Verify campaign creation success rate

### Database Queries (Supabase)
```sql
-- Check recent campaigns
SELECT id, name, user_id, created_at, initial_goal
FROM campaigns
ORDER BY created_at DESC
LIMIT 10;

-- Check temp prompts
SELECT id, prompt_text, goal_type, used, expires_at
FROM temp_prompts
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check for orphaned temp prompts (not used but not expired)
SELECT id, created_at, expires_at, used
FROM temp_prompts
WHERE used = false
  AND expires_at > NOW()
  AND created_at < NOW() - INTERVAL '5 minutes';
```

---

## Common Issues & Solutions

### Issue: "Campaign Not Found" Error
**Symptoms**: Campaign created successfully in logs but page shows not found  
**Cause**: Race condition - navigation happens before database commit  
**Solution**: ✅ Fixed by waiting for campaign verification before navigation

### Issue: Temp Prompt Not Processed
**Symptoms**: User authenticates but no campaign is created  
**Cause**: Email sign-in wasn't checking for temp prompt  
**Solution**: ✅ Fixed by adding temp prompt check in sign-in form

### Issue: Double Campaign Creation
**Symptoms**: Two campaigns created for same temp prompt  
**Cause**: Page refresh during auth flow  
**Solution**: ✅ Fixed with sessionStorage sentinel key

### Issue: Expired Temp Prompt
**Symptoms**: Auth succeeds but campaign creation fails  
**Cause**: Temp prompt expired (30 minute TTL)  
**Solution**: ✅ Clear error message shown to user

---

## Success Criteria

### Must Have (P0)
- ✅ OAuth with temp prompt creates campaign and loads page
- ✅ Email signup with temp prompt creates campaign
- ✅ Email signin with temp prompt creates campaign
- ✅ No "Campaign Not Found" errors after successful creation
- ✅ User-friendly error messages for all failure cases

### Should Have (P1)
- ✅ Toast notifications provide feedback
- ✅ Loading states show progress
- ✅ Error pages offer recovery options
- ✅ OAuth/signin without temp prompt redirects gracefully

### Nice to Have (P2)
- ✅ Edge cases handled (browser back, refresh, network issues)
- ✅ Comprehensive logging for debugging
- ✅ Expired prompt messages are clear

---

## Deployment Checklist

### Pre-Deploy
- [ ] All tests pass locally
- [ ] No TypeScript or linting errors
- [ ] Database migrations applied (if any)
- [ ] Environment variables verified

### Deploy to Staging
- [ ] Deploy code to staging environment
- [ ] Test OAuth flow with real Google OAuth
- [ ] Test email flows with real email verification
- [ ] Monitor Vercel logs for errors

### Deploy to Production
- [ ] Deploy to production
- [ ] Monitor first 10 users
- [ ] Watch error rates in Vercel dashboard
- [ ] Check campaign creation success rate

### Post-Deploy Monitoring (First 24 Hours)
- [ ] Zero "Campaign Not Found" errors
- [ ] Campaign creation success rate > 99%
- [ ] Average time to campaign page < 3 seconds
- [ ] No user reports of authentication issues

---

## Rollback Plan

If critical issues are found:

1. **Immediate**: Revert to previous version
2. **Investigate**: Check Vercel logs for error patterns
3. **Fix**: Address root cause in development
4. **Re-test**: Complete full test suite
5. **Re-deploy**: Deploy fixed version to production

---

## Contact

If you encounter issues during testing:
- Check Vercel logs for detailed error messages
- Review console logs in browser DevTools
- Check Supabase database for data inconsistencies
- Reference this guide for expected behavior

---

**Last Updated**: November 16, 2025  
**Implementation Status**: ✅ Complete  
**Testing Status**: ⏸️ Awaiting Manual Testing

