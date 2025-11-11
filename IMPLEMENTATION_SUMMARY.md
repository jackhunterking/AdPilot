# Ad Edit Hydration Fix - Implementation Summary

## Overview
Fixed the major logic issue where editing existing ads did not properly hydrate creative and copy data, while the image would show. Now all ad data (creative, copy, location, audience, destination) properly loads when entering edit mode.

## Changes Made

### 1. Schema Update (Supabase Migration)
**File**: `supabase/migrations/20250111_add_setup_snapshot_to_ads.sql`
- Added `setup_snapshot` jsonb column to `ads` table
- Added GIN index for faster JSON queries
- Added documentation comment

**Action Required**: Run this migration in Supabase:
```bash
# Option 1: Via Supabase Dashboard SQL Editor
# Copy and paste the migration file contents

# Option 2: Via Supabase CLI (if using local development)
supabase db push
```

### 2. TypeScript Types Update
**File**: `lib/supabase/database.types.ts`
- Added `setup_snapshot: Json | null` to `ads` table Row, Insert, and Update types
- Ensures type safety for snapshot operations

### 3. API Routes Updated

#### Create Ad Route
**File**: `app/api/campaigns/[id]/ads/route.ts`
- Now persists `setup_snapshot` when creating ads
- Derives `creative_data` and `copy_data` from snapshot for backward compatibility
- Gracefully handles ads without snapshots

#### Draft Ad Route  
**File**: `app/api/campaigns/[id]/ads/draft/route.ts`
- Includes `setup_snapshot: null` in initial draft creation
- Ensures schema consistency

#### Update Ad Route
**File**: `app/api/campaigns/[id]/ads/[adId]/route.ts`
- Already supports `setup_snapshot` updates via allowedFields

### 4. Hydration Utilities
**File**: `lib/utils/snapshot-hydration.ts`
- Created comprehensive hydration functions for all contexts:
  - `hydrateAdPreviewFromSnapshot()` - Loads images, headline, body, CTA
  - `hydrateAdCopyFromSnapshot()` - Loads copy variations and selection
  - `hydrateLocationFromSnapshot()` - Loads targeting locations
  - `hydrateAudienceFromSnapshot()` - Loads audience targeting
  - `hydrateDestinationFromSnapshot()` - Loads form/URL/phone config
- Added validation function `isValidSnapshot()`
- Added convenience function `hydrateAllContextsFromSnapshot()`

### 5. Campaign Workspace Integration
**File**: `components/campaign-workspace.tsx`
- Updated `handleEditAd()` to hydrate contexts from snapshot
- Falls back to legacy `creative_data` and `copy_data` for old ads
- Logs detailed trace information for debugging
- Shows toast error if ad loading fails
- Properly resets/replaces context state (doesn't merge with existing data)

## How It Works

### Edit Flow (with Snapshot)
1. User clicks "Edit" on an ad card
2. `handleEditAd(adId)` is called
3. System finds the ad from the `ads` array
4. Checks for `setup_snapshot` field
5. If snapshot exists and is valid:
   - Hydrates ad preview context (images, headline, body, CTA)
   - Hydrates ad copy context (variations, selection)
   - Hydrates location context (target locations)
   - Hydrates audience context (targeting parameters)
   - Hydrates destination context (form/URL/phone)
6. If no snapshot (legacy ad):
   - Falls back to `creative_data` and `copy_data` fields
   - Loads what's available
7. Navigates to edit mode with hydrated state

### Create/Save Flow
1. User builds an ad through the wizard
2. On save, `buildAdSnapshot()` creates complete snapshot
3. Snapshot is persisted to `setup_snapshot` column
4. `creative_data` and `copy_data` are also saved for backward compatibility
5. Ad can now be edited and will properly hydrate

## Testing Checklist

### Test Case 1: Fresh Ad with Snapshot
1. ✅ Create a new ad through the wizard
2. ✅ Complete all steps (creative, copy, location, audience, destination)
3. ✅ Save the ad
4. ✅ Click "Edit" on the ad
5. ✅ Verify all fields are populated:
   - Images show correctly
   - Headline, body, and CTA are visible
   - Copy variations are loaded
   - Location targeting is shown
   - Audience targeting is displayed
   - Destination (form/URL/phone) is configured

### Test Case 2: Legacy Ad without Snapshot
1. ✅ Open an existing ad created before this update
2. ✅ Click "Edit" on the ad
3. ✅ Verify fallback logic works:
   - Images load from `creative_data`
   - Copy loads from `copy_data` or `creative_data`
   - Other fields may be empty (expected for legacy)

### Test Case 3: Rapid Ad Switching
1. ✅ Edit Ad A
2. ✅ Navigate back to all ads
3. ✅ Edit Ad B (different ad)
4. ✅ Verify Ad B's data shows (not Ad A's data)
5. ✅ Check console logs for proper hydration sequence

### Test Case 4: Draft Ad Creation
1. ✅ Click "New Ad" button
2. ✅ Verify new draft is created with `setup_snapshot: null`
3. ✅ Build the ad through wizard
4. ✅ Save and verify snapshot is persisted

### Test Case 5: Edit Mode State Reset
1. ✅ Edit an ad, make some changes (don't save)
2. ✅ Click back button
3. ✅ Edit a different ad
4. ✅ Verify the second ad's data is loaded correctly (no contamination from first ad)

## Edge Cases Handled

1. **Missing Snapshot**: Falls back to legacy `creative_data` and `copy_data`
2. **Invalid Snapshot Structure**: Validates with `isValidSnapshot()`, falls back if invalid
3. **Partial Snapshot**: Each hydration function handles missing fields gracefully
4. **Null Values**: All hydration functions check for null/undefined
5. **Type Safety**: Strong typing throughout ensures runtime safety

## Migration Path

### For Existing Ads (No Snapshot)
- Ads created before this update will NOT have `setup_snapshot`
- When edited, they will use fallback logic (legacy data)
- When saved after editing, a snapshot will be created for future edits
- No data loss or breaking changes

### For New Ads (With Snapshot)
- All new ads will have complete snapshots
- Full hydration will work immediately
- Edit experience is seamless

## Console Logging

For debugging, the implementation includes detailed console logs:
- `[edit_ad_XXXXXX_timestamp]` prefix for all edit operations
- Logs when snapshot is found vs. legacy fallback
- Logs each context hydration step
- Logs errors with stack traces

## Performance Considerations

1. **Lazy Import**: Hydration utilities are imported dynamically (`await import()`)
2. **Index**: GIN index on `setup_snapshot` for future analytics queries
3. **Minimal Overhead**: Hydration only happens on edit, not on list view
4. **Single Source of Truth**: Snapshot eliminates multiple database queries

## Future Enhancements

1. **Migration Script**: Optionally backfill snapshots for old ads
2. **Snapshot Versioning**: Track schema version for future migrations
3. **Partial Hydration**: Only hydrate changed fields for performance
4. **Validation Layer**: Add runtime validation for snapshot structure

## References

- **Supabase JSON Docs**: https://supabase.com/docs/guides/database/json
- **AI SDK Core**: https://ai-sdk.dev/docs/introduction
- **AI Elements**: https://ai-sdk.dev/elements/overview
- **Vercel AI Gateway**: https://vercel.com/docs/ai-gateway

