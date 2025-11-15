# Location Targeting - Final Fix Plan
**100% Root Cause Verified**

---

## Root Cause Summary

**Problem:** `useAutoSave` cleanup function cancels the 300ms debounced save before it executes.

**Evidence:**
1. Database shows `setup_snapshot.location.locations = []` (empty)
2. Console shows useAutoSave triggered but API never called
3. Code trace confirms cleanup runs: `clearTimeout(timeoutRef.current)`

**Why it happens:**
- Location data updates → useAutoSave schedules save in 300ms
- AI message arrives or component re-renders within 300ms
- useEffect cleanup clears the timeout
- Save never happens

---

## The Fix: Immediate Save for Location Data

### Change 1: Bypass useAutoSave in addLocations()

**File:** `lib/context/location-context.tsx`

**Current (Broken):**
```typescript
const addLocations = (newLocations: Location[], shouldMerge: boolean = true) => {
  setLocationState(prev => ({...}))  // Only updates state
  // Relies on useAutoSave with 300ms delay ← BREAKS HERE
}
```

**Fixed:**
```typescript
const addLocations = useCallback((newLocations: Location[], shouldMerge: boolean = true) => {
  if (!newLocations || newLocations.length === 0) {
    console.error('[LocationContext] addLocations: empty array');
    return;
  }
  
  setLocationState(prev => {
    let finalLocations: Location[];
    
    if (shouldMerge) {
      const existingMap = new Map(prev.locations.map(loc => [`${loc.name}-${loc.mode}`, loc]))
      newLocations.forEach(newLoc => {
        existingMap.set(`${newLoc.name}-${newLoc.mode}`, newLoc)
      })
      finalLocations = Array.from(existingMap.values())
    } else {
      finalLocations = newLocations
    }
    
    const updated = {
      ...prev,
      locations: finalLocations,
      status: 'completed' as const,
      errorMessage: undefined
    };
    
    // IMMEDIATE SAVE - Don't wait for useAutoSave
    if (currentAd?.id && isInitialized) {
      updateAdSnapshot({
        location: {
          locations: updated.locations,
          status: updated.status || 'completed'
        }
      }).then(() => {
        console.log('[LocationContext] Location data saved successfully');
      }).catch(error => {
        console.error('[LocationContext] Failed to save locations:', error);
      });
    }
    
    return updated;
  });
}, [currentAd?.id, isInitialized, updateAdSnapshot]);
```

### Change 2: Same Fix for removeLocation()

**File:** `lib/context/location-context.tsx`

```typescript
const removeLocation = useCallback((id: string) => {
  setLocationState(prev => {
    const updatedLocations = prev.locations.filter(loc => loc.id !== id);
    const updated = {
      ...prev,
      locations: updatedLocations,
      status: updatedLocations.length > 0 ? 'completed' as const : 'idle' as const
    };
    
    // Immediate save
    if (currentAd?.id && isInitialized) {
      updateAdSnapshot({
        location: {
          locations: updated.locations,
          status: updated.status || 'completed'
        }
      }).catch(error => {
        console.error('[LocationContext] Failed to save after remove:', error);
      });
    }
    
    return updated;
  });
}, [currentAd?.id, isInitialized, updateAdSnapshot]);
```

---

## Database Cleanup Plan

### Phase 1: Remove Redundant Location Storage

**Migration 1: Drop location_sets table**
```sql
-- This table has 0 records and is completely unused
DROP TABLE IF EXISTS location_sets CASCADE;
```

**Migration 2: Remove deprecated location_data column**
```sql
-- campaign_states.location_data is deprecated (moved to ads.setup_snapshot.location)
ALTER TABLE campaign_states DROP COLUMN IF EXISTS location_data;
```

### Phase 2: Remove Other Unused Tables

**Tables with 0 records to investigate:**
- creative_variants (data now in ads.setup_snapshot.creative)
- copy_variants (data now in ads.setup_snapshot.copy)
- campaign_meta_links (redundant with campaign_meta_connections)
- meta_connections (redundant with campaign_meta_connections)
- meta_asset_snapshots (unused)

**Safe to remove:**
```sql
DROP TABLE IF EXISTS creative_variants CASCADE;
DROP TABLE IF EXISTS copy_variants CASCADE;
DROP TABLE IF EXISTS location_sets CASCADE;
DROP TABLE IF EXISTS meta_asset_snapshots CASCADE;
```

**Need code check before removing:**
- campaign_meta_links
- meta_connections

### Phase 3: Remove Legacy Columns

```sql
-- Remove deprecated generated_images column
ALTER TABLE campaign_states DROP COLUMN IF EXISTS generated_images;

-- Already removed location_data above
```

---

## Implementation Order

### Step 1: Fix addLocations() with Immediate Save
- Modify `lib/context/location-context.tsx`
- Add useCallback with immediate updateAdSnapshot call
- Add error logging

### Step 2: Fix removeLocation() with Immediate Save
- Same pattern as addLocations()
- Immediate save after state update

### Step 3: Test Location Saving
- Add any location (Toronto, Paris, Tokyo, etc.)
- Check console for `[PATCH snapshot] Updating ad snapshot`
- Query database to verify data saved
- Refresh page → verify map renders

### Step 4: Database Cleanup (After Fix Verified)
- Create migration to drop unused tables
- Create migration to remove deprecated columns
- Run migrations via MCP

### Step 5: Final Testing
- Test all location scenarios (add, remove, edit, refresh)
- Verify no regressions in other contexts
- Confirm database is lean

---

## Expected Results

**After Fix:**
1. Setting any location immediately saves to database
2. Map renders location boundaries (green=include, red=exclude)
3. Page refresh preserves location data
4. Console shows `[PATCH snapshot] Snapshot updated successfully`
5. Database query shows `locations: [{...}]` with geometry

**After Cleanup:**
- 5 fewer tables (location_sets, creative_variants, copy_variants, meta_asset_snapshots, etc.)
- 2 fewer columns (location_data, generated_images)
- Cleaner, more maintainable schema
- Single source of truth for all data

---

## Files to Modify

1. `lib/context/location-context.tsx` - Add immediate save to addLocations/removeLocation
2. Create new migration file - Drop unused tables
3. Create new migration file - Remove deprecated columns

---

## Success Criteria

- ✅ Location data saves to database immediately
- ✅ Map renders any location with proper colors
- ✅ Data persists across page refreshes
- ✅ Database has only essential tables
- ✅ No redundant location storage paths
- ✅ Clear console logs (no floods, just errors)

