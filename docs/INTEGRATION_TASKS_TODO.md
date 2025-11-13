# Publishing System Integration Tasks

## 🎯 Overview

This document lists all the integration tasks needed to complete the new publishing status system. The core infrastructure is built, but these integrations are needed to connect everything together.

---

## ✅ Already Completed

- ✅ Database schema & migrations applied
- ✅ TypeScript types updated
- ✅ Publishing API endpoints created
- ✅ Status sync service built
- ✅ UI components (badges, buttons, modals, tooltips)
- ✅ Custom hooks (usePublishAd, useAdStatusSubscription)
- ✅ Error handling system
- ✅ Toast notifications

---

## 🔧 CRITICAL - Must Complete for System to Work

### 1. Update Campaign Workspace Publish Handler
**Priority:** CRITICAL  
**File:** `components/campaign-workspace.tsx`  
**Current Issue:** Using old publish logic

**Changes needed:**
```typescript
// Add imports
import { usePublishAd } from '@/lib/hooks/use-publish-ad'
import { useMultipleAdsStatusSubscription } from '@/lib/hooks/use-ad-status-subscription'

// Inside component:
const { publishAd, isPublishing } = usePublishAd()

// Add real-time subscription
useMultipleAdsStatusSubscription({
  campaignId: campaign?.id || null,
  onAnyStatusChange: (adId, newStatus) => {
    console.log(`Ad ${adId} status changed to ${newStatus}`)
    void refreshAds()
  },
  enabled: !!campaign?.id
})

// Update publish handler
const handlePublishAd = async (adId: string) => {
  const result = await publishAd(campaignId, adId)
  if (result.success) {
    await refreshAds()
  }
}
```

**Lines to modify:** Around line 50-120 (publish handler section)

---

### 2. Fix Status Field References
**Priority:** CRITICAL  
**Issue:** Code uses old `status` field instead of `publishing_status`

**Search and Replace:**
```
Find:    ad.status === 'pending_approval'
Replace: ad.status === 'pending_review'

Find:    status === 'pending_approval'
Replace: status === 'pending_review'
```

**Files to check:**
- `components/campaign-workspace.tsx`
- `components/preview-panel.tsx`
- `components/results/results-panel.tsx`
- `lib/utils/ad-status.ts` (already done ✅)
- `components/ui/ad-status-badge.tsx` (already done ✅)

---

### 3. Update All Ads Grid Filter Options
**Priority:** HIGH  
**File:** `components/all-ads-grid.tsx`  
**Line:** 87-95

**Change this:**
```typescript
const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Ads' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Under Review' },  // ← OLD
  { value: 'active', label: 'Live' },
  { value: 'learning', label: 'Learning' },
  { value: 'paused', label: 'Paused' },
  { value: 'rejected', label: 'Needs Changes' },
]
```

**To this:**
```typescript
const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Ads' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Meta Reviewing' },  // ← NEW
  { value: 'active', label: 'Live' },
  { value: 'learning', label: 'Learning' },
  { value: 'paused', label: 'Paused' },
  { value: 'rejected', label: 'Needs Changes' },
  { value: 'failed', label: 'Failed' },  // ← ADDED
]
```

---

### 4. Update useCampaignAds Hook
**Priority:** CRITICAL  
**File:** `lib/hooks/use-campaign-ads.ts`

**Ensure SELECT query includes these fields:**
```typescript
.select(`
  id,
  name,
  status,
  publishing_status,  // ← Add if missing
  meta_ad_id,        // ← Add if missing
  last_error,        // ← Add if missing
  published_at,      // ← Add if missing
  approved_at,       // ← Add if missing
  rejected_at,       // ← Add if missing
  // ... rest of fields
`)
```

**Also update the type mapping to prefer publishing_status:**
```typescript
// In the data mapping
status: ad.publishing_status || ad.status,
last_error: ad.last_error,
meta_ad_id: ad.meta_ad_id,
```

---

## 🎨 UI INTEGRATION - Recommended

### 5. Update Preview Panel Header
**Priority:** MEDIUM  
**File:** `components/preview-panel.tsx`

**Add to header section (around line 200-300):**
```typescript
import { AdStatusBadge } from '@/components/ui/ad-status-badge'
import { ErrorTooltip } from '@/components/publishing/error-tooltip'
import { PublishErrorModal } from '@/components/publishing/publish-error-modal'

// In header JSX:
{ad && (
  <div className="flex items-center gap-2">
    <AdStatusBadge status={ad.status} size="sm" />
    {(ad.status === 'failed' || ad.status === 'rejected') && ad.last_error && (
      <ErrorTooltip 
        error={ad.last_error as PublishError} 
        onClick={() => setShowErrorModal(true)}
      />
    )}
  </div>
)}
```

---

### 6. Update Publish Flow Dialog
**Priority:** MEDIUM  
**File:** `components/launch/publish-flow-dialog.tsx`

**Replace old publish button with:**
```typescript
import { PublishButton } from '@/components/publishing/publish-button'
import { usePublishAd } from '@/lib/hooks/use-publish-ad'

// In component:
const { publishAd, isPublishing } = usePublishAd()

// Replace existing button with:
<PublishButton
  status={currentAd?.status || 'draft'}
  onClick={handlePublish}
  loading={isPublishing}
  size="lg"
  className="w-full"
/>
```

---

### 7. Add Real-time Status Updates to All Ads Grid
**Priority:** MEDIUM  
**File:** `components/all-ads-grid.tsx`

**Add subscription at top of component:**
```typescript
import { useMultipleAdsStatusSubscription } from '@/lib/hooks/use-ad-status-subscription'

// Inside component:
useMultipleAdsStatusSubscription({
  campaignId,
  onAnyStatusChange: (adId, newStatus) => {
    // Optionally trigger a refresh
    onRefreshAds?.()
  },
  enabled: !!campaignId
})
```

---

## ⚙️ CONFIGURATION - One-time Setup

### 8. Enable Supabase Realtime
**Priority:** HIGH  
**Where:** Supabase Dashboard

**Steps:**
1. Go to https://supabase.com/dashboard
2. Select your AdPilot project
3. Navigate to: Database → Replication
4. Enable realtime for these tables:
   - ✅ `ads`
   - ✅ `ad_publishing_metadata`
   - ✅ `ad_status_transitions`
5. Click "Save"

**Screenshot locations in docs:** See `docs/PUBLISHING_STATUS_SYSTEM.md`

---

### 9. Verify Environment Variables
**Priority:** MEDIUM  
**File:** `.env.local`

**Ensure these exist:**
```bash
# Required for Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here

# Optional: For Meta Webhooks (production)
META_WEBHOOK_VERIFY_TOKEN=your_token_here
```

---

## 🔍 TESTING CHECKLIST

### 10. Manual Testing Steps
**Priority:** HIGH  
**When:** After completing integration tasks

**Test Scenarios:**

#### A. Basic Publish Flow
- [ ] Create a new draft ad
- [ ] Click "Publish" button
- [ ] Verify status changes to "Meta is Reviewing"
- [ ] Check badge shows yellow color with pulse animation
- [ ] Check toast notification appears

#### B. Error Handling
- [ ] Disconnect Meta (or test without payment method)
- [ ] Try to publish
- [ ] Verify error modal appears
- [ ] Check error tooltip shows on ad card
- [ ] Click info icon → Error modal should open
- [ ] Verify "Retry" button works

#### C. Real-time Updates
- [ ] Open campaign in two browser tabs
- [ ] Publish ad in tab 1
- [ ] Verify status updates in tab 2 (within 2-3 seconds)
- [ ] No page refresh should be needed

#### D. Status Transitions
- [ ] Test: Draft → Publish → Pending Review
- [ ] Test: Active → Pause → Paused
- [ ] Test: Paused → Resume → Active
- [ ] Test: Failed → Retry → Pending Review

#### E. Status Filtering
- [ ] Go to All Ads view
- [ ] Use status filter dropdown
- [ ] Verify each filter shows correct ads
- [ ] Check "Failed" filter is available

---

## 🐛 DEBUGGING GUIDE

### Common Issues and Solutions

#### Issue: Status not updating in UI
**Solution:**
1. Check browser console for Supabase connection errors
2. Verify realtime is enabled in Supabase dashboard
3. Check `useAdStatusSubscription` hook is active (see `isSubscribed` value)
4. Try manual refresh

#### Issue: Publish button not working
**Solution:**
1. Check browser console for API errors
2. Verify `/api/campaigns/[id]/ads/[id]/publish` endpoint exists
3. Check Meta connection is active
4. Verify ad has all required fields

#### Issue: Error modal not showing
**Solution:**
1. Check `ad.last_error` field exists in database
2. Verify error is properly typed as `PublishError`
3. Check `PublishErrorModal` component is imported
4. Look for TypeScript errors in console

#### Issue: Real-time not working
**Solution:**
1. Verify Supabase realtime is enabled for tables
2. Check environment variables are set
3. Clear browser cache and reload
4. Check Supabase logs for connection issues

---

## 📊 VERIFICATION QUERIES

### Check Migration Applied
```sql
-- Run in Supabase SQL Editor
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_name IN ('ad_publishing_metadata', 'meta_webhook_events', 'ad_status_transitions')
ORDER BY table_name, ordinal_position;
```

### Check Existing Ads Migrated
```sql
SELECT 
  id,
  name,
  status as old_status,
  publishing_status as new_status,
  meta_ad_id,
  last_error
FROM ads;
```

### Check Metadata Records
```sql
SELECT 
  apm.ad_id,
  a.name as ad_name,
  apm.current_status,
  apm.error_code,
  apm.retry_count
FROM ad_publishing_metadata apm
JOIN ads a ON a.id = apm.ad_id;
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Deploying to Production

- [ ] All integration tasks completed
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Realtime enabled in Supabase
- [ ] Environment variables set
- [ ] Migration applied to production database
- [ ] Backup database before migration
- [ ] Test publish flow in staging first

---

## 📞 SUPPORT

### If You Get Stuck

1. **Check Documentation:**
   - Main guide: `docs/PUBLISHING_STATUS_SYSTEM.md`
   - This file: `docs/INTEGRATION_TASKS_TODO.md`

2. **Check Implementation:**
   - Status badge: `components/ui/ad-status-badge.tsx`
   - Publish button: `components/publishing/publish-button.tsx`
   - Error modal: `components/publishing/publish-error-modal.tsx`
   - Publish hook: `lib/hooks/use-publish-ad.ts`

3. **Database Issues:**
   - Check Supabase logs in dashboard
   - Run verification queries above
   - Check RLS policies are correct

4. **API Issues:**
   - Check `/api/campaigns/[id]/ads/[id]/publish` logs
   - Verify Meta connection is active
   - Check error messages in response

---

## ✅ COMPLETION CHECKLIST

### Mark as complete when done:

**Critical Path:**
- [ ] Task 1: Update campaign workspace publish handler
- [ ] Task 2: Fix all status field references
- [ ] Task 3: Update all ads grid filter options
- [ ] Task 4: Update useCampaignAds hook
- [ ] Task 8: Enable Supabase realtime

**UI Integration:**
- [ ] Task 5: Update preview panel header
- [ ] Task 6: Update publish flow dialog
- [ ] Task 7: Add real-time to all ads grid

**Testing:**
- [ ] Task 10: Complete manual testing checklist
- [ ] All test scenarios passing
- [ ] No errors in console

**Configuration:**
- [ ] Task 9: Environment variables verified
- [ ] Realtime enabled in Supabase
- [ ] Migration verified in production

---

## 📝 NOTES

- Keep this document updated as you complete tasks
- Mark completed items with ✅
- Add any issues encountered in the Debugging section
- Document any custom changes you make

**Last Updated:** {current_date}
**Status:** Ready for Integration
**Estimated Time:** 2-3 hours for all tasks

