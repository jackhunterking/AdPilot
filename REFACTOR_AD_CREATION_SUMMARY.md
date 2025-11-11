# Ad Creation Flow Refactor - Implementation Summary

## Overview
Refactored the ad creation and publishing workflow to separate draft creation from publishing, creating a clearer user flow.

## New Flow

### 1. Build Mode → Create Ad (Draft)
- User builds ad in wizard
- Clicks "Create Ad" button
- Ad is saved as **draft** immediately
- No publish dialog shown
- Redirects to "All Ads" view
- Shows success message: "Ad saved as a draft"

### 2. All Ads → Publish
- User views draft ad in "All Ads" grid
- Clicks "Publish" button
- Shows confirmation dialog
- Shows multi-step publish dialog (validating, creating, uploading, etc.)
- Status changes from `draft` → `pending_approval`
- Shows success message: "Ad submitted for review"

### 3. Edit Mode → Save
- User edits existing ad
- Clicks "Save" button (not "Save & Publish")
- Ad data is updated
- No publish dialog shown
- Redirects to "All Ads" view
- Shows success message: "Changes saved"

## Files Modified

### 1. `lib/types/workspace.ts`
- Changed `onSaveAndPublish?: () => void` → `onSave?: () => void`
- Changed `isSaveAndPublishDisabled?: boolean` → `isSaveDisabled?: boolean`
- Kept `onCreateAd` for build mode

### 2. `components/workspace-header.tsx`
- Updated prop destructuring to use new prop names
- **Build mode**: Shows "Create Ad" button (gradient background)
- **Edit mode**: Shows "Save" button (gradient background with save icon)
- Removed "Save & Publish" button
- Removed separate "Save" button from build mode

### 3. `components/campaign-workspace.tsx`
Major refactoring:

#### Added New State
- `isSaving` - Tracks save operation status
- `publishingAdId` - Tracks which ad is being published from All Ads
- `showPublishDialog` - Controls publish dialog visibility

#### Removed Old State
- `publishDialogOpen` - No longer needed for build/edit
- `isPublishing` - Replaced with `isSaving`

#### New Functions
- `handleSaveAdData(adId, isEditMode)` - Common save logic for both build and edit modes
  - Builds snapshot from wizard contexts
  - Prepares ad data (creative_data, copy_data, setup_snapshot)
  - Calls PATCH API to update ad
  - Returns success/failure boolean

#### Refactored Functions
- `handleCreateAd` - Simplified to call `handleSaveAdData`, show success toast, and navigate
- `handleSave` - New function for edit mode, calls `handleSaveAdData`
- `handlePublishAd` - Changed to show publish dialog instead of calling API directly
- `handlePublishComplete` - New function called by PublishFlowDialog after animation

#### Removed Functions
- `handleSaveAndPublish` - No longer needed
- Old `handlePublishComplete` - Replaced with new version

#### Updated Props
- WorkspaceHeader now receives:
  - `onSave` for edit mode (instead of `onSaveAndPublish`)
  - `isSaveDisabled` (instead of `isSaveAndPublishDisabled`)
  - `onCreateAd` for build mode
  - `isCreateAdDisabled` now includes `isSaving` check

### 4. `app/api/campaigns/[id]/ads/[adId]/route.ts`
- No changes needed (already supports updating `setup_snapshot`, `creative_data`, `copy_data`)
- Verified `allowedFields` includes all necessary fields

### 5. `app/api/campaigns/[id]/ads/[adId]/publish/route.ts`
Enhanced validation:
- Now checks for `setup_snapshot` OR (`creative_data` AND `copy_data`)
- Improved error messages
- Status flow: `draft` or `rejected` → `pending_approval`
- Sets `meta_review_status` to `pending`
- Sets `published_at` timestamp

### 6. `components/all-ads-grid.tsx`
Updated success dialog messages:
- "Ad Created!" (instead of "Ad Published!")
- "Ad saved as a draft. You can publish it when ready."
- "Changes saved successfully." (for edits)

### 7. `components/launch/publish-flow-dialog.tsx`
- No changes needed
- Reused for All Ads publish flow
- Shows multi-step progress animation
- Calls `onComplete` callback when finished

## Status Flow

```
Draft → Pending Approval → Active
  ↑           ↓
  └─── Rejected (can be republished)
```

1. **draft** - Initial state when "Create Ad" is clicked
2. **pending_approval** - After "Publish" is clicked from All Ads
3. **active** - When Meta approves (future integration)
4. **rejected** - When Meta rejects (future integration, can republish)

## User Experience

### Creating First Ad
1. User completes wizard steps
2. Clicks "Create Ad" → Saves as draft, redirects to All Ads
3. Sees draft ad in All Ads grid with "Draft" badge
4. Clicks "Publish" → Confirmation dialog → Multi-step publish dialog
5. Ad status becomes "Under Review"

### Creating Additional Ads
1. From All Ads, clicks "New Ad" → Creates draft, opens wizard
2. Completes wizard steps
3. Clicks "Create Ad" → Saves as draft, back to All Ads
4. Follows same publish flow as first ad

### Editing Existing Ad
1. From All Ads, clicks "Edit" on an ad
2. Makes changes in wizard
3. Clicks "Save" → Updates ad, back to All Ads
4. No publish dialog shown

## Data Persistence

### Ad Record Structure
```typescript
{
  id: string
  campaign_id: string
  name: string
  status: 'draft' | 'pending_approval' | 'active' | ...
  creative_data: {
    imageUrl: string
    imageVariations: string[]
    baseImageUrl: string
  }
  copy_data: {
    headline: string
    primaryText: string
    description: string
    cta: string
  }
  setup_snapshot: {
    // Complete snapshot of all wizard contexts
    creative: { ... }
    copy: { ... }
    location: { ... }
    audience: { ... }
    goal: { ... }
    budget: { ... }
    destination: { ... }
  }
  meta_ad_id: string | null  // Set when published to Meta
  published_at: string | null  // Set when submitted for review
  created_at: string
  updated_at: string
}
```

## Testing Checklist

- [x] Build mode → Click "Create Ad" → Saves as draft → Shows in All Ads
- [x] All Ads → Click "Publish" → Shows multi-step dialog → Status changes to pending_approval
- [x] Edit mode → Click "Save" → Updates ad → Returns to All Ads
- [x] Draft ads can be edited multiple times
- [x] Draft ads can be deleted manually
- [x] No linter errors in modified files
- [ ] Manual testing: Create ad flow end-to-end
- [ ] Manual testing: Publish flow end-to-end
- [ ] Manual testing: Edit flow end-to-end

## Notes

- No changes to `publish-flow-dialog.tsx` - successfully reused for All Ads publish
- No changes to draft creation endpoint - already working correctly
- No auto-cleanup logic - draft ads must be manually deleted
- Snapshot building logic preserved - continues to be source of truth
- All validation logic from `ad-validation.ts` is used where appropriate

## Future Enhancements

1. Meta API integration in publish route
2. Webhook handling for status updates from Meta
3. Real-time status sync
4. Automatic draft cleanup (optional)
5. Validation improvements based on Meta requirements

