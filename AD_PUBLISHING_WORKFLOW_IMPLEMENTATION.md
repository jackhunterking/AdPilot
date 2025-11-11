# Ad Publishing Workflow - Implementation Complete

## Overview
Successfully implemented a comprehensive ad publishing workflow with proper status stages (draft → pending_approval → active), detailed tracking, and user-friendly displays. The system is now ready for testing and future Meta API integration.

## What Was Implemented

### 1. Database Schema ✅
**File**: `supabase/migrations/20250112_add_ad_status_tracking.sql`

Added columns to track the publishing lifecycle:
- `published_at` - When user submitted for review
- `approved_at` - When ad was approved  
- `rejected_at` - When ad was rejected
- `meta_review_status` - Tracks review state (not_submitted, pending, approved, rejected, changes_requested)
- Updated status constraint to include: draft, pending_approval, active, learning, paused, rejected, archived

### 2. TypeScript Types ✅
**File**: `lib/types/workspace.ts`

- Added `AdStatus` type with all status values
- Added `MetaReviewStatus` type for tracking review state
- Updated `AdVariant` interface with new fields:
  - `meta_review_status?: MetaReviewStatus`
  - `published_at?: string`
  - `approved_at?: string`
  - `rejected_at?: string`

### 3. Status Helper Utilities ✅
**File**: `lib/utils/ad-status.ts`

Created comprehensive utility functions:
- `getStatusLabel()` - User-friendly labels
- `getStatusColor()` - Color coding for each status
- `getStatusConfig()` - Complete configuration with colors, icons, descriptions
- `getStatusMessage()` - Contextual messages with dates
- `canPublish()`, `canEdit()`, `canPause()`, `canResume()` - Permission checks
- `canTransitionTo()` - Status transition validation
- `sortByStatusPriority()` - Sort ads by status importance
- `filterByStatus()` - Filter ads by status
- `getStatusSummary()` - Count ads by status

### 4. Validation Logic ✅
**File**: `lib/utils/ad-validation.ts`

Enhanced validation with status-based permissions:
- `validatePublishPermission()` - Check if ad can be published
- `validateEditPermission()` - Check if ad can be edited
- `validatePausePermission()` - Check if ad can be paused
- `validateResumePermission()` - Check if ad can be resumed
- `getAdActionAvailability()` - Get all available actions for an ad

### 5. API Endpoints ✅

**Updated**: `app/api/campaigns/[id]/ads/[adId]/publish/route.ts`
- Changed status from draft to `pending_approval` (not active)
- Set `meta_review_status` to `pending`
- Set `published_at` timestamp
- Allow republishing rejected ads

**New**: `app/api/campaigns/[id]/ads/[adId]/approve/route.ts`
- Manually approve pending ads (dev/testing)
- Change status to `active`
- Set `meta_review_status` to `approved`
- Set `approved_at` timestamp
- Future: Will be triggered by Meta webhook

**New**: `app/api/campaigns/[id]/ads/[adId]/reject/route.ts`
- Manually reject pending ads (dev/testing)
- Change status to `rejected`
- Set `meta_review_status` to `rejected`
- Set `rejected_at` timestamp
- Accept optional rejection reason
- Future: Will be triggered by Meta webhook

### 6. UI Components ✅

**New**: `components/ui/ad-status-badge.tsx`
- Reusable status badge with color coding
- Tooltips with detailed information
- Animated pulsing for pending status
- Compact dot version for tight spaces

**New**: `components/ui/ad-status-timeline.tsx`
- Visual timeline showing ad lifecycle
- Draft created → Submitted → Approved/Rejected
- Shows dates for each milestone
- Contextual descriptions at each stage
- Highlights current status

**New**: `components/admin/ad-approval-panel.tsx`
- Dev-only panel for testing approval flow
- Shows all pending_approval ads
- Quick approve/reject buttons
- Rejection reason input
- Only visible in development mode

**Updated**: `components/launch/publish-flow-dialog.tsx`
- Changed completion message: "Ad Submitted for Review"
- Updated header: "Submitting Ad" → "Ad Submitted!"
- New messaging: "Your ad is Under Review by Meta"
- Explains 24-hour review timeline
- Removed auto-close, shows status instead

**Updated**: `components/all-ads-grid.tsx`
- Added status filter bar with counts
- Filter by: All, Draft, Under Review, Live, Learning, Paused, Needs Changes
- Shows admin approval panel (dev only)
- Sorts ads by status priority
- Empty state for filtered results

**Updated**: `components/ad-card.tsx`
- Replaced hardcoded badges with `AdStatusBadge` component
- Shows tooltips with detailed status info
- Consistent styling across all status

**Updated**: `components/results-panel.tsx`
- Added "Ad Status" card at top
- Shows `AdStatusTimeline` component
- Displays current status badge
- Provides context about review status

**Updated**: `components/campaign-workspace.tsx`
- Passes `campaignId` to AllAdsGrid
- Passes `onRefreshAds` callback for admin panel
- Supports new status flow

## User Flow

### Publishing an Ad
1. User completes ad setup (creative, copy, location, audience, budget)
2. Clicks "Publish Ad" button
3. System validates all requirements
4. If valid, opens publish dialog
5. Shows progress steps (validating, creating, uploading, etc.)
6. **Status changes to `pending_approval`**
7. Dialog shows "Ad Submitted for Review"
8. Explains 24-hour review timeline
9. User can view status in All Ads grid

### Approval Flow (Dev/Testing)
1. Admin panel shows all pending ads
2. Dev can approve or reject with reason
3. Approve: Status → `active`, timestamp set
4. Reject: Status → `rejected`, reason stored
5. User sees updated status in real-time

### Rejected Ads
1. Ad shows "Needs Changes" status in red
2. Timeline shows rejection with reason
3. User can edit the ad
4. User can republish (goes back to pending_approval)

### Status Visibility
- **All Ads Grid**: Filter bar with counts, status badges on each card
- **Results Panel**: Status timeline card showing full lifecycle
- **Ad Card**: Status badge with color coding and tooltip

## Status Definitions

| Status | User-Friendly Label | Color | Description |
|--------|-------------------|-------|-------------|
| `draft` | Draft | Gray | Being built, not published yet |
| `pending_approval` | Under Review | Yellow (pulsing) | Submitted for Meta review |
| `active` | Live | Green | Approved and running |
| `learning` | Learning | Blue | Active, in optimization phase |
| `paused` | Paused | Orange | Temporarily stopped |
| `rejected` | Needs Changes | Red | Rejected by Meta, needs fixes |
| `archived` | Archived | Gray | Historical/inactive |

## Meta Review Status

| Value | Meaning |
|-------|---------|
| `not_submitted` | Draft, not sent to Meta |
| `pending` | Under review by Meta |
| `approved` | Approved and live |
| `rejected` | Rejected, needs changes |
| `changes_requested` | Specific changes requested |

## Testing Guide

### 1. Publish an Ad
- Create a complete ad with all required fields
- Click "Publish Ad"
- Verify status changes to `pending_approval`
- Check that `published_at` timestamp is set
- Verify publish dialog shows "Under Review" messaging

### 2. Admin Approval Panel
- In development mode, navigate to All Ads view
- Verify admin panel appears with pending ads
- Click "Approve" button
- Verify status changes to `active`
- Check that `approved_at` timestamp is set
- Verify ad shows as "Live" in grid

### 3. Admin Rejection
- Publish another ad to pending
- In admin panel, enter rejection reason
- Click "Reject" button
- Verify status changes to `rejected`
- Check that `rejected_at` timestamp is set
- Verify ad shows as "Needs Changes"

### 4. Republish Rejected Ad
- Find a rejected ad
- Click "Publish" again
- Verify it goes back to `pending_approval`
- Check that `rejected_at` is cleared

### 5. Status Filtering
- In All Ads view, click different status filters
- Verify only matching ads show
- Check that counts are accurate
- Verify empty state for unused statuses

### 6. Status Timeline
- View results for an ad
- Check "Ad Status" card shows timeline
- Verify all dates are displayed correctly
- Check that current status is highlighted

### 7. Status Badges
- Verify badges appear on ad cards
- Check tooltips show detailed descriptions
- Verify pending status badge pulses
- Check colors match status types

## Future: Meta API Integration

When ready to integrate with Meta:

### 1. Update Publish Endpoint
**File**: `app/api/campaigns/[id]/ads/[adId]/publish/route.ts`

```typescript
// Replace this comment:
// TODO: Integrate with Meta API to actually submit the ad

// With actual Meta API call:
const metaResponse = await fetch(`https://graph.facebook.com/v18.0/act_${adAccountId}/ads`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: ad.name,
    creative: { /* creative data */ },
    targeting: { /* targeting data */ },
    status: 'PAUSED', // Submit as paused, Meta will review
  })
})

const metaAd = await metaResponse.json()

// Update with Meta Ad ID
await supabaseServer
  .from('ads')
  .update({
    meta_ad_id: metaAd.id,
    status: 'pending_approval',
    meta_review_status: 'pending',
    published_at: new Date().toISOString(),
  })
  .eq('id', adId)
```

### 2. Create Webhook Handler
**New File**: `app/api/webhooks/meta/ad-review/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // Verify webhook signature
  const signature = request.headers.get('x-hub-signature-256')
  // ... verify signature ...
  
  const body = await request.json()
  
  // Handle different webhook events
  if (body.entry?.[0]?.changes?.[0]?.field === 'ads') {
    const change = body.entry[0].changes[0]
    const adData = change.value
    
    // Find ad by meta_ad_id
    const { data: ad } = await supabaseServer
      .from('ads')
      .select('*')
      .eq('meta_ad_id', adData.id)
      .single()
    
    if (!ad) return NextResponse.json({ success: true })
    
    // Update based on review status
    if (adData.effective_status === 'ACTIVE') {
      // Approved
      await supabaseServer
        .from('ads')
        .update({
          status: 'active',
          meta_review_status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', ad.id)
    } else if (adData.effective_status === 'DISAPPROVED') {
      // Rejected
      await supabaseServer
        .from('ads')
        .update({
          status: 'rejected',
          meta_review_status: 'rejected',
          rejected_at: new Date().toISOString(),
          metrics_snapshot: {
            ...ad.metrics_snapshot,
            rejection_reason: adData.issues?.[0]?.error_message || 'Unknown reason'
          }
        })
        .eq('id', ad.id)
    }
  }
  
  return NextResponse.json({ success: true })
}
```

### 3. Remove Admin Panel
Once webhooks are working, remove or hide the admin approval panel:
```typescript
// In components/admin/ad-approval-panel.tsx
if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_USE_META_WEBHOOKS === 'true') {
  return null
}
```

## Files Modified/Created

### New Files (11)
1. `supabase/migrations/20250112_add_ad_status_tracking.sql`
2. `lib/utils/ad-status.ts`
3. `components/ui/ad-status-badge.tsx`
4. `components/ui/ad-status-timeline.tsx`
5. `components/admin/ad-approval-panel.tsx`
6. `app/api/campaigns/[id]/ads/[adId]/approve/route.ts`
7. `app/api/campaigns/[id]/ads/[adId]/reject/route.ts`
8. `AD_PUBLISHING_WORKFLOW_IMPLEMENTATION.md` (this file)

### Modified Files (9)
1. `lib/types/workspace.ts` - Added status types and review fields
2. `lib/utils/ad-validation.ts` - Added status-based validation
3. `app/api/campaigns/[id]/ads/[adId]/publish/route.ts` - Updated to pending_approval
4. `components/launch/publish-flow-dialog.tsx` - Updated messaging
5. `components/all-ads-grid.tsx` - Added filters and admin panel
6. `components/ad-card.tsx` - Added status badge
7. `components/results-panel.tsx` - Added status timeline
8. `components/campaign-workspace.tsx` - Added campaignId prop

## Environment Variables

No new environment variables required. The admin panel automatically detects development mode via `process.env.NODE_ENV`.

For future Meta integration, you'll need:
```env
# Meta API
NEXT_PUBLIC_META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_webhook_token

# Optional: Switch to real Meta webhooks in dev
NEXT_PUBLIC_USE_META_WEBHOOKS=false
```

## Success Criteria ✅

All requirements from the plan have been met:

- ✅ Database schema updated with status tracking
- ✅ TypeScript types updated with new statuses
- ✅ Publish endpoint sets pending_approval status
- ✅ Approve/reject endpoints created for testing
- ✅ Status badge component with colors and tooltips
- ✅ Status timeline component showing lifecycle
- ✅ Status helper utilities for labels and validation
- ✅ PublishFlowDialog updated with pending messaging
- ✅ All-ads grid shows status badges and filters
- ✅ Results panel shows status timeline
- ✅ Admin panel for manual testing
- ✅ Campaign workspace handles new flow
- ✅ Validation logic updated for status permissions

## Next Steps

1. **Run Migration**: Apply the database migration to add new columns
   ```bash
   # Via Supabase CLI
   supabase migration up
   
   # Or manually in Supabase Dashboard
   # Copy contents of migrations/20250112_add_ad_status_tracking.sql
   # Run in SQL Editor
   ```

2. **Test Locally**: Follow the testing guide above to verify all flows work

3. **Deploy**: Deploy to staging/production when ready

4. **Meta Integration**: When ready, implement the webhook handler and update publish endpoint

## Notes

- The admin approval panel only shows in development mode
- All status transitions are validated to prevent invalid state changes
- Status badges automatically pulse for pending_approval status
- Timeline component shows contextual messages based on how long an ad has been under review
- Rejected ads can be edited and republished
- All user-facing messaging is friendly and explains what's happening

## Support

For questions or issues:
- Check the inline code comments for implementation details
- Review the status helper utilities in `lib/utils/ad-status.ts`
- Test using the admin panel in development mode
- Refer to Meta API documentation for future integration

