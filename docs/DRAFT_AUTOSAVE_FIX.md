# Draft Auto-Save Infinite Loop Fix

## Problem
The draft auto-save hook was triggering infinite PATCH requests to `/api/campaigns/{campaignId}/ads/{adId}` because:
1. Every call to `buildAdSnapshot()` generated a new `createdAt` timestamp
2. The timestamp was included in the JSON comparison
3. Even when no user data changed, the snapshot appeared different
4. This triggered a save, which triggered another interval check, repeating infinitely

## Root Cause
**File:** `lib/hooks/use-draft-auto-save.ts`

The hook compared `JSON.stringify(snapshot)` which included volatile metadata fields that regenerated on every call:
- `createdAt`: New timestamp on every `buildAdSnapshot()` execution
- `wizardVersion`: Static metadata field
- `metaConnection`: Optional connection state

## Solution
Created a **stable snapshot signature** by explicitly selecting only user-editable fields for comparison:

```typescript
const stableSnapshot = {
  creative: snapshot.creative,
  copy: snapshot.copy,
  destination: snapshot.destination,
  location: snapshot.location,
  audience: snapshot.audience,
  goal: snapshot.goal,
  budget: snapshot.budget,
  // Explicitly exclude: createdAt, wizardVersion, metaConnection
}

const currentSignature = JSON.stringify(stableSnapshot)
```

**Key Changes:**
1. Only compare fields that represent actual user edits
2. Update `lastSaveRef` only after successful save (prevents retry loops)
3. Added comprehensive documentation explaining which fields to include/exclude

## Files Modified
- `lib/hooks/use-draft-auto-save.ts`
  - Added extensive header documentation explaining snapshot comparison strategy
  - Created `stableSnapshot` object excluding volatile fields
  - Added inline comments marking excluded fields
  - Moved `lastSaveRef.current` update inside successful response block

## Testing Instructions

### Manual Smoke Test

1. **Setup:**
   - Navigate to an existing campaign in build mode: `/{campaignId}?view=build&adId={adId}`
   - Open Chrome DevTools → Network tab
   - Filter by "Fetch/XHR"
   - Clear network log

2. **Test: Idle State (No Changes)**
   - Wait for 15+ seconds without making any changes
   - **Expected:** Zero PATCH requests to `/ads/{adId}`
   - **Previously:** Continuous PATCH requests every 15 seconds

3. **Test: Single Edit**
   - Make one change (e.g., click "Next" on audience step to complete targeting)
   - Wait 15 seconds
   - **Expected:** Exactly ONE PATCH request within ~15 seconds
   - Check console logs for `[DraftAutoSave] Draft saved successfully`

4. **Test: Multiple Edits**
   - Change audience age range (e.g., 18-25 → 20-55)
   - Wait 15 seconds → should see 1 PATCH
   - Change gender selection (e.g., all → female)
   - Wait 15 seconds → should see 1 PATCH
   - **Expected:** One PATCH per real change, spaced by interval

5. **Test: Rapid Edits**
   - Make 3-4 changes within 5 seconds (toggle interests, change age, change gender)
   - **Expected:** Only ONE PATCH request (last edit wins, debounced by interval)

6. **Test: Network Failure Recovery**
   - Throttle network to "Offline" in DevTools
   - Make a change
   - Wait 15 seconds
   - **Expected:** Error logged, no infinite retries
   - Re-enable network → next change should save normally

### Automated Verification

**Console Logs to Monitor:**
```
✅ Good:
[DraftAutoSave] No changes detected, skipping save
[DraftAutoSave] Draft saved successfully at {timestamp}

❌ Bad (indicates regression):
[DraftAutoSave] Failed to save draft: ...
[DraftAutoSave] Error saving draft: ...
(Multiple PATCH requests when no changes made)
```

**Network Tab:**
- Filter: `ads/` in URL filter
- Method: PATCH
- Status: 200 OK
- Frequency: Should match number of real edits, max 1 per 15 seconds

## Future-Proofing

When adding new fields to `AdSetupSnapshot` (in `lib/types/ad-snapshot.ts`):

1. **Is it user-editable data?**
   - YES → Add to `stableSnapshot` comparison
   - NO → Exclude from `stableSnapshot`, document why

2. **Does it change on every render/call?**
   - YES → Must exclude (will cause infinite loop)
   - NO → Safe to include if user-editable

3. **Examples:**
   - ✅ Include: `audience.demographics.ageMin` (user sets this)
   - ✅ Include: `location.locations` (user adds/removes)
   - ❌ Exclude: `createdAt` (auto-generated timestamp)
   - ❌ Exclude: `wizardVersion` (static metadata)
   - ❌ Exclude: `lastModifiedBy` (if added, it's metadata)

## Related Files

- `lib/types/ad-snapshot.ts` - Snapshot type definitions
- `lib/services/ad-snapshot-builder.ts` - Builds snapshots from context
- `lib/hooks/use-draft-auto-save.ts` - Auto-save hook (modified)
- `components/campaign-workspace.tsx` - Uses the hook

## References
- Issue: Infinite PATCH loop on audience step
- Console logs: `[DraftAutoSave]` prefix
- Network tab: Filter by `/api/campaigns/*/ads/*`

