# Data Persistence Fix - COMPLETE

**Date:** November 17, 2025  
**Status:** ✅ Fixed - Ready for Testing  
**Commit:** `251b62b`

---

## Issues Fixed

### 1. ✅ Selected Creative/Copy Don't Persist on Refresh

**Root Cause:**
- Snapshot API was manually inserting to `ad_creatives` and `ad_copy_variations` tables
- Did NOT update FK columns (`selected_creative_id`, `selected_copy_id`) in `ads` table
- On refresh, `buildSnapshot()` couldn't find which creative/copy was selected
- Result: `selectedImageIndex = -1`, context didn't hydrate

**Fix Applied:**
- Replaced manual DB operations with existing `adDataService.saveCreatives()` and `adDataService.saveCopyVariations()`
- These methods automatically update FK columns (lines 258-263 and 306-312 in ad-data-service.ts)
- Now buildSnapshot() correctly finds selected items

**File Changed:** `app/api/campaigns/[id]/ads/[adId]/snapshot/route.ts`
- Removed ~25 lines of duplicate logic
- Added ~10 lines using existing adDataService methods

### 2. ✅ Stepper Shows Warning Signs Instead of Checkmarks

**Root Cause:**
- Auto-save updates `ads.completed_steps` column in database ✅
- But `currentAd` context was not reloaded after save ❌
- Stepper reads stale `currentAd.completed_steps` → shows warnings

**Fix Applied:**
- Added `reloadAd()` call after auto-save completes
- Added `onSuccess` callback to `useSaveAd` hook
- All save operations now reload currentAd to sync completed_steps

**Files Changed:**
- `lib/hooks/use-draft-auto-save.ts` - calls `reloadAd()` after auto-save
- `lib/hooks/use-save-ad.ts` - supports `onSuccess` callback
- `components/preview-panel.tsx` - passes `onSuccess: () => reloadAd()`
- `components/campaign-workspace.tsx` - passes `onSuccess: () => reloadAd()`

---

## Technical Details

### Data Flow (After Fix)

```
[User selects creative/copy]
  ↓
[Auto-save triggers (15s interval)]
  ↓
useDraftAutoSave → /snapshot API
  ↓
adDataService.saveCreatives(adId, creatives, selectedIndex)
  ├─ Deletes old ad_creatives rows
  ├─ Inserts new ad_creatives rows
  ├─ Gets inserted IDs
  └─ Updates ads.selected_creative_id = creatives[selectedIndex].id ✅
  ↓
adDataService.saveCopyVariations(adId, variations, selectedIndex)
  ├─ Deletes old ad_copy_variations rows
  ├─ Inserts new ad_copy_variations rows
  ├─ Sets is_selected = true for selected variation
  └─ Updates ads.selected_copy_id = selectedVariation.id ✅
  ↓
Snapshot API updates ads.completed_steps = ['ads', 'copy', ...] ✅
  ↓
reloadAd() refreshes currentAd from database ✅
  ↓
Stepper reads currentAd.completed_steps → shows checkmarks ✅
```

### On Page Refresh

```
[Page loads]
  ↓
CurrentAdProvider loads ad from /api/campaigns/[id]/ads/[adId]
  ↓
API calls adDataService.getCompleteAdData(adId)
  ↓
buildSnapshot() reads:
  - ads.selected_creative_id → finds index in creatives array ✅
  - ads.selected_copy_id → finds is_selected variation ✅
  ↓
Returns snapshot with correct selectedImageIndex and selectedCopyIndex
  ↓
AdPreviewContext hydrates with selected creative ✅
AdCopyContext hydrates with selected copy ✅
  ↓
UI shows selected creative/copy immediately ✅
```

---

## Code Changes Summary

### Before (Broken)

**Snapshot API:**
```typescript
// ❌ Manual save - doesn't update FKs
await supabaseServer.from('ad_creatives').delete().eq('ad_id', adId)
await supabaseServer.from('ad_creatives').insert(creativeInserts)
// Missing: Update ads.selected_creative_id
```

**Auto-save:**
```typescript
if (response.ok) {
  console.log('[DraftAutoSave] ✅ Saved')
  // Missing: reloadAd()
}
```

### After (Fixed)

**Snapshot API:**
```typescript
// ✅ Uses existing method - updates FKs automatically
const creatives = creativeData.imageVariations.map(...)
await adDataService.saveCreatives(adId, creatives, selectedIndex)
```

**Auto-save:**
```typescript
if (response.ok) {
  console.log('[DraftAutoSave] ✅ Saved')
  await reloadAd() // ✅ Refreshes currentAd.completed_steps
}
```

---

## Testing Instructions

### Test 1: Creative Persistence

1. Go to Ad Creative step
2. Generate 3 image variations
3. **Click "Select" on variation 2**
4. Wait 15 seconds (auto-save)
5. **Refresh the page** (Cmd+R)
6. Navigate to Ad Creative step

**Expected:**
- ✅ Variation 2 should still be selected (blue checkmark)
- ✅ Stepper shows green checkmark for "Ad Creative" step
- ✅ Console shows: `[AdPreviewContext] ✅ Loaded 3 creatives from backend`
- ✅ Console shows: `selectedIdx = 1` (for variation 2)

**Before fix:** Variation not selected, warning sign on stepper
**After fix:** Variation selected, checkmark on stepper

### Test 2: Copy Persistence

1. Go to Ad Copy step
2. Generate 3 copy variations
3. **Click "Select" on variation 3**
4. Wait 15 seconds (auto-save)
5. **Refresh the page** (Cmd+R)
6. Navigate to Ad Copy step

**Expected:**
- ✅ Variation 3 should still be selected
- ✅ Stepper shows green checkmark for "Ad Copy" step
- ✅ Console shows: `[AdCopyContext] ✅ Loaded 3 copy variations from backend`

### Test 3: Stepper Checkmarks (Real-time)

1. Create new ad
2. Select creative variation
3. Wait 15 seconds
4. **Don't refresh** - just observe stepper
5. Move to copy step
6. Select copy variation
7. Wait 15 seconds
8. Observe stepper

**Expected:**
- ✅ After 15s on creative step, stepper shows green checkmark
- ✅ After 15s on copy step, both steps show green checkmarks
- ✅ No warning signs visible

**Before fix:** Warning signs persist until manual refresh
**After fix:** Checkmarks appear automatically after auto-save

---

## Key Improvements

### Lean Approach Applied ✅

1. **Reused Existing Code:**
   - Used `adDataService.saveCreatives()` - already exists
   - Used `adDataService.saveCopyVariations()` - already exists
   - Used `reloadAd()` - already exists
   - NO new services or utilities created

2. **Removed Duplicate Logic:**
   - Deleted ~25 lines of manual DB operations
   - Replaced with ~10 lines calling existing methods
   - Net reduction: ~15 lines

3. **Single Source of Truth:**
   - Database FKs (`selected_creative_id`, `selected_copy_id`) are now authoritative
   - buildSnapshot() reads from FKs
   - No intermediate state or caching

### Alignment with Master Architecture ✅

**From MASTER_API_DOCUMENTATION.md:**
- ✅ Using v1 API patterns (adDataService)
- ✅ Normalized table structure with proper FKs
- ✅ Single save endpoint per resource type
- ✅ Consistent error handling

**Cursor Project Rules:**
- ✅ Type-safe with no `any` types
- ✅ Follows Vercel AI SDK v5 patterns
- ✅ Uses Supabase best practices for FKs and normalization
- ✅ Lean code with minimal additions

---

## Database State (After Fix)

When you select creative variation 2 and copy variation 1:

**ads table:**
```sql
id: xxx-xxx-xxx
selected_creative_id: <creative_2_id>  ← FK to ad_creatives
selected_copy_id: <copy_1_id>          ← FK to ad_copy_variations
completed_steps: ["ads", "copy", ...]  ← JSONB array
```

**ad_creatives table:**
```sql
id: <creative_1_id>, ad_id: xxx, image_url: "url1", sort_order: 0
id: <creative_2_id>, ad_id: xxx, image_url: "url2", sort_order: 1  ← SELECTED
id: <creative_3_id>, ad_id: xxx, image_url: "url3", sort_order: 2
```

**ad_copy_variations table:**
```sql
id: <copy_1_id>, ad_id: xxx, headline: "...", is_selected: true   ← SELECTED
id: <copy_2_id>, ad_id: xxx, headline: "...", is_selected: false
id: <copy_3_id>, ad_id: xxx, headline: "...", is_selected: false
```

**buildSnapshot() logic:**
```typescript
selectedImageIndex = ad_creatives.findIndex(c => c.id === ads.selected_creative_id)
// Returns 1 (variation 2) ✅

selectedCopyIndex = ad_copy_variations.findIndex(c => c.is_selected)
// Returns 0 (variation 1) ✅
```

---

## Rollout Notes

### Deployment
1. Changes deployed to `new-flow` branch
2. No database migrations needed (FKs already exist)
3. No breaking changes to API contracts
4. Backward compatible (uses existing adDataService)

### Monitoring
After deployment, check console for:
- ✅ `[useSaveAd] ✅ Save successful`
- ✅ `[DraftAutoSave] ✅ Saved`
- ✅ `[CurrentAdContext] Loading ad ...`
- ✅ `[AdPreviewContext] ✅ Loaded X creatives from backend`

Should NOT see:
- ❌ `selectedImageIndex = -1`
- ❌ `⚠️ Using legacy fallback data`

---

## Success Criteria

All 3 tests must pass:

- [ ] **Test 1:** Creative selection persists across refresh
- [ ] **Test 2:** Copy selection persists across refresh  
- [ ] **Test 3:** Stepper shows checkmarks immediately after auto-save (no refresh needed)

If all pass → Issue completely resolved ✅

---

## References

- **adDataService:** `/lib/services/ad-data-service.ts` (lines 239-319)
- **Snapshot API:** `/app/api/campaigns/[id]/ads/[adId]/snapshot/route.ts`
- **Database Schema:** FK constraints on `ads.selected_creative_id` and `ads.selected_copy_id`
- **Supabase Docs:** https://supabase.com/docs/guides/database/joins-and-nesting

