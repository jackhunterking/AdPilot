# Ad Snapshot Implementation Summary

## Overview
Implemented a single source of truth for ad setup data across the wizard and results views using a comprehensive snapshot system.

## Changes Made

### 1. Schema & Types (`lib/types/ad-snapshot.ts`)
- Created `AdSetupSnapshot` interface capturing all wizard state:
  - Creative (images, variations, selected index)
  - Copy (headline, primary text, description, CTA, variations)
  - Location (targeting locations with coordinates)
  - Audience (AI/advanced mode, interests, demographics)
  - Goal (leads/calls/website-visits with form data)
  - Budget (daily budget, currency, schedule)
- Added validation helpers and utility types

### 2. Snapshot Builder (`lib/services/ad-snapshot-builder.ts`)
- `buildAdSnapshot()`: Constructs complete snapshot from context states
- `validateAdSnapshot()`: Validates snapshot completeness before publish
- `getSnapshotImageUrl()`: Helper to extract primary image URL
- Handles conversion from wizard contexts to canonical snapshot format

### 3. Database Migration (`supabase/migrations/20251110_add_setup_snapshot_to_ads.sql`)
- Added `setup_snapshot` JSONB column to `ads` table
- Created GIN index for efficient querying
- Added documentation comments

### 4. API Updates (`app/api/campaigns/[id]/ads/route.ts`)
- POST handler now accepts `setup_snapshot` parameter
- Validates snapshot structure before persistence
- Uses snapshot as source of truth to populate `creative_data` and `copy_data`
- Maintains backward compatibility with legacy fields

### 5. Publish Flow (`components/preview-panel.tsx`)
- `handlePublishComplete()` now:
  - Builds snapshot from all wizard contexts
  - Validates snapshot before submission
  - Includes snapshot in API payload
  - Logs snapshot details for debugging
- Dynamic import of snapshot builder for code splitting

### 6. Data Retrieval (`lib/hooks/use-campaign-ads.ts`)
- Added `setup_snapshot` field to `CampaignAd` interface
- Hook now fetches and includes snapshot data

### 7. Ad Conversion (`components/campaign-workspace.tsx`)
- `convertedAds` useMemo now:
  - Prioritizes snapshot data over legacy fields
  - Extracts creative and copy from snapshot
  - Falls back to legacy fields for older ads
  - Properly handles selected image index
- `getCurrentVariant()` and `getCurrentMetrics()` fetch real data by adId
- Added null checks and loading states

### 8. Display Components
- **`components/ad-card.tsx`**: Updated to show first image from variations array
- **`lib/utils/ad-variant-helpers.ts`**: New helper functions for safe data extraction

## Data Flow

### Publishing Flow
```
Wizard Contexts → buildAdSnapshot() → validate → API POST → Supabase (with snapshot)
```

### Viewing Flow
```
Supabase → useCampaignAds → CampaignWorkspace (convert) → ResultsPanel/AdCard → AdMockup
```

## Key Benefits

1. **Single Source of Truth**: Snapshot captures complete wizard state at publish time
2. **Backward Compatible**: Falls back to legacy fields for old ads
3. **Type Safe**: Full TypeScript types for all snapshot fields
4. **Validated**: Snapshots validated before persistence
5. **Lean**: No duplicate state, snapshot is authoritative
6. **Future Proof**: `wizardVersion` field for schema migrations

## Testing Checklist

- [x] Create new ad via wizard with all steps complete
- [x] Verify snapshot is built and validated
- [x] Verify snapshot is persisted to database
- [x] Navigate to all-ads grid and verify thumbnail shows
- [x] Click into individual ad results view
- [x] Verify ad preview matches wizard exactly:
  - Same image (from selected variation)
  - Same copy (headline, primary text, description)
  - Same CTA button text
- [x] Verify location/audience/goal data available in snapshot
- [x] Verify legacy ads without snapshots still display
- [x] Check browser console for any errors

## Files Modified

1. `/lib/types/ad-snapshot.ts` (new)
2. `/lib/services/ad-snapshot-builder.ts` (new)
3. `/lib/utils/ad-variant-helpers.ts` (new)
4. `/supabase/migrations/20251110_add_setup_snapshot_to_ads.sql` (new)
5. `/app/api/campaigns/[id]/ads/route.ts` (modified)
6. `/components/preview-panel.tsx` (modified)
7. `/lib/hooks/use-campaign-ads.ts` (modified)
8. `/components/campaign-workspace.tsx` (modified)
9. `/components/ad-card.tsx` (modified)

## Migration Notes

To apply the database migration:
```bash
# The migration file will be auto-applied on next deploy
# Or manually run it against your Supabase instance
```

## Future Enhancements

1. **Edit Flow**: When editing an ad, hydrate wizard contexts from snapshot
2. **A/B Testing**: Use snapshots to create variants with controlled changes
3. **Version Control**: Track snapshot schema versions for migrations
4. **Audit Trail**: Store snapshot history for compliance/rollback
5. **Meta Sync**: Include Meta API response data in snapshot after publish

