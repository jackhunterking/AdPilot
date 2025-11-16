# 🚨 Critical Issues Report - Backend Refactoring

**Date**: January 16, 2025  
**Status**: Database ✅ Complete | Application ❌ WILL BREAK

---

## ⚠️ CRITICAL: Files That Will Cause 500 Errors

These files reference deleted tables and will crash your application:

### 1. `/api/campaigns/[id]/state/route.ts` ❌ WILL CRASH

**Location**: `app/api/campaigns/[id]/state/route.ts`  
**Line 145-149**: Queries deleted `campaign_states` table

```typescript
const { data, error } = await supabaseServer
  .from('campaign_states')  // ❌ TABLE DOESN'T EXIST ANYMORE
  .select('*')
  .eq('campaign_id', campaignId)
  .single()
```

**Error**: `relation "campaign_states" does not exist`

**Solution**: DELETE this entire file. The endpoint is obsolete.

---

### 2. `lib/services/state-manager.ts` ❌ WILL CRASH

**Likely Issue**: This service manages `campaign_states` table operations

**Files Using It**: 15 API files found

**Solution**: Either:
- A) Delete the service and refactor APIs to use new tables
- B) Rewrite it to use new normalized tables

---

### 3. Files Referencing `campaign_states` (15 Files)

All these files will fail when they try to access `campaign_states`:

1. ❌ `app/api/chat/route.ts`
2. ❌ `app/api/v1/chat/route.ts`
3. ❌ `app/api/v1/meta/admin/route.ts`
4. ❌ `app/api/v1/meta/assets/route.ts`
5. ❌ `app/api/v1/meta/status/route.ts`
6. ❌ `app/api/v1/campaigns/[id]/state/route.ts`
7. ❌ `app/api/v1/campaigns/route.ts`
8. ❌ `app/api/v1/campaigns/[id]/route.ts`
9. ❌ `app/api/meta/selection/route.ts`
10. ❌ `app/api/campaigns/route.ts`
11. ❌ `app/api/campaigns/[id]/state/route.ts`
12. ❌ `app/api/campaigns/[id]/route.ts`
13. ❌ `app/api/campaigns/[id]/prepare-publish/route.ts`
14. ❌ `app/api/campaigns/[id]/budget/route.ts`
15. ❌ `app/api/campaigns/[id]/ab-test/route.ts`

---

### 4. Files Referencing `setup_snapshot` (10 Files)

These files reference the deleted `ads.setup_snapshot` column:

1. ❌ `app/api/v1/ads/[id]/save/route.ts`
2. ❌ `app/api/v1/ads/[id]/route.ts`
3. ❌ `app/api/v1/ads/route.ts`
4. ❌ `app/api/v1/campaigns/route.ts`
5. ❌ `app/api/campaigns/route.ts`
6. ❌ `app/api/campaigns/[id]/ads/route.ts`
7. ❌ `app/api/campaigns/[id]/ads/draft/route.ts`
8. ❌ `app/api/campaigns/[id]/ads/[adId]/snapshot/route.ts`
9. ❌ `app/api/campaigns/[id]/ads/[adId]/save/route.ts`
10. ❌ `app/api/campaigns/[id]/ads/[adId]/route.ts`

**Error**: `column "setup_snapshot" does not exist`

**Solution**: Update to query new normalized tables:
- `ad_creatives` for creative data
- `ad_copy_variations` for copy data
- `ad_target_locations` for location data
- `ad_destinations` for destination config
- `ad_budgets` for budget data

---

## 🔴 Impact Assessment

### Immediate Failures

**When User Tries To:**
- Load campaign state → 500 ERROR
- Update campaign state → 500 ERROR
- Save ad data → 500 ERROR
- Fetch ad details → 500 ERROR
- Publish campaign → 500 ERROR

**Result**: Most of the application will be non-functional

---

## ✅ What's Working

These parts are unaffected and will continue to work:

- ✅ User authentication
- ✅ Campaign list view (if not using `campaign_states` join)
- ✅ AI chat (conversations + messages tables intact)
- ✅ Meta OAuth (campaign_meta_connections intact)
- ✅ Publishing metadata (ad_publishing_metadata intact)
- ✅ Lead form submissions (lead_form_submissions intact)
- ✅ Metrics cache (campaign_metrics_cache intact)

---

## 🛠️ Required Fixes (Prioritized)

### IMMEDIATE (Must Fix to Restore Basic Functionality)

#### 1. Delete obsolete `/state` endpoint ⚠️ HIGH PRIORITY
```bash
# Delete these files:
rm app/api/campaigns/[id]/state/route.ts
rm app/api/v1/campaigns/[id]/state/route.ts
```

#### 2. Update campaign APIs to stop joining campaign_states

**File**: `app/api/campaigns/[id]/route.ts`

**Before**:
```typescript
const { data: campaign } = await supabaseServer
  .from('campaigns')
  .select(`*, campaign_states (*)`)
  .eq('id', id)
  .single()
```

**After**:
```typescript
const { data: campaign } = await supabaseServer
  .from('campaigns')
  .select(`*`)
  .eq('id', id)
  .single()
```

#### 3. Update ad APIs to use new tables

**File**: `app/api/campaigns/[id]/ads/[adId]/route.ts`

**Before**:
```typescript
const { data: ad } = await supabaseServer
  .from('ads')
  .select(`*, setup_snapshot`)
  .eq('id', adId)
  .single()
```

**After**:
```typescript
const { data: ad } = await supabaseServer
  .from('ads')
  .select(`
    *,
    ad_creatives (*),
    ad_copy_variations (*),
    ad_target_locations (*),
    ad_destinations (*),
    ad_budgets (*)
  `)
  .eq('id', adId)
  .single()
```

---

### MEDIUM PRIORITY (Create New Endpoints)

#### Create new ad data endpoints:

1. **`POST /api/ads/[id]/creative`** - Add/update creative
```typescript
// Save creative to ad_creatives table
await supabase.from('ad_creatives').insert({
  ad_id,
  creative_format: 'feed',
  image_url,
  creative_style,
  is_base_image: true
})
```

2. **`POST /api/ads/[id]/copy`** - Add/update copy variations
```typescript
// Save copy to ad_copy_variations table
await supabase.from('ad_copy_variations').insert({
  ad_id,
  headline,
  primary_text,
  cta_text,
  is_selected: true
})
```

3. **`POST /api/ads/[id]/locations`** - Add/update targeting
```typescript
// Save locations to ad_target_locations table
await supabase.from('ad_target_locations').insert({
  ad_id,
  location_name: 'Toronto, ON',
  location_type: 'city',
  inclusion_mode: 'include'
})
```

4. **`POST /api/ads/[id]/destination`** - Add/update destination
```typescript
// Save destination to ad_destinations table
await supabase.from('ad_destinations').insert({
  ad_id,
  destination_type: 'website_url',
  website_url: 'https://example.com'
})
```

5. **`POST /api/ads/[id]/budget`** - Add/update budget
```typescript
// Save budget to ad_budgets table
await supabase.from('ad_budgets').insert({
  ad_id,
  daily_budget_cents: 50000, // $500
  currency_code: 'USD'
})
```

---

### LOW PRIORITY (Nice to Have)

#### Create query/analytics endpoints:

1. **`GET /api/ads/search`** - Filter ads by criteria
```typescript
// Example: Find all ads targeting Toronto with budget > $100
const { data } = await supabase
  .from('ads')
  .select('*, ad_target_locations!inner(*), ad_budgets!inner(*)')
  .ilike('ad_target_locations.location_name', '%Toronto%')
  .gt('ad_budgets.daily_budget_cents', 10000)
```

2. **`GET /api/analytics/campaigns`** - Cross-campaign analytics
```typescript
// Example: Budget analysis across campaigns
const { data } = await supabase
  .from('campaigns')
  .select(`
    name,
    campaign_budget_cents,
    ads (
      count,
      ad_budgets (daily_budget_cents)
    )
  `)
```

---

## 📋 Migration Checklist

### Phase 1: Stop the Bleeding (1-2 hours)
- [ ] Delete `/api/campaigns/[id]/state/route.ts`
- [ ] Delete `/api/v1/campaigns/[id]/state/route.ts`
- [ ] Update `app/api/campaigns/[id]/route.ts` - remove campaign_states join
- [ ] Update `app/api/campaigns/route.ts` - remove campaign_states join
- [ ] Test: Can list campaigns without errors
- [ ] Test: Can view campaign details without errors

### Phase 2: Restore Save Functionality (2-3 hours)
- [ ] Update `/api/campaigns/[id]/ads/[adId]/save/route.ts` - use new tables
- [ ] Update `/api/campaigns/[id]/ads/[adId]/snapshot/route.ts` - use new tables
- [ ] Create `/api/ads/[id]/creative/route.ts` - creative CRUD
- [ ] Create `/api/ads/[id]/copy/route.ts` - copy CRUD
- [ ] Create `/api/ads/[id]/locations/route.ts` - location CRUD
- [ ] Create `/api/ads/[id]/destination/route.ts` - destination CRUD
- [ ] Create `/api/ads/[id]/budget/route.ts` - budget CRUD
- [ ] Test: Can save ad data without errors

### Phase 3: Update AI Context Builders (1-2 hours)
- [ ] Find all files in `lib/ai/` that reference `setup_snapshot` or `campaign_states`
- [ ] Update to query new normalized tables
- [ ] Test: AI chat still works

### Phase 4: Full Testing (2-3 hours)
- [ ] Test: Create new campaign
- [ ] Test: Upload/generate creative
- [ ] Test: Generate and select copy
- [ ] Test: Add location targeting
- [ ] Test: Configure destination
- [ ] Test: Set budget
- [ ] Test: Publish to Meta
- [ ] Test: Edit existing ad
- [ ] Test: View results

---

## 🎯 Success Criteria

Application is considered "fixed" when:

✅ User can create a new campaign  
✅ User can add creative to ad  
✅ User can generate and select copy  
✅ User can add location targeting  
✅ User can configure destination (form/URL/phone)  
✅ User can set budget  
✅ User can publish to Meta  
✅ AI chat works correctly  
✅ No 500 errors related to deleted tables

---

## 💡 Pro Tips

1. **Start Small**: Fix one endpoint at a time, test, then move to next
2. **Use TypeScript**: New types in `database.types.ts` will guide you
3. **Test Queries**: Use Supabase SQL editor to test joins before coding
4. **Check Logs**: Monitor server logs for remaining `campaign_states` references
5. **Frontend Last**: Fix all APIs first, then update frontend components

---

## 📞 Need Help?

**Database Documentation**: See `MIGRATION_VERIFICATION_REPORT.md`  
**Example Queries**: See `BACKEND_REFACTORING_SUMMARY.md`  
**Type Definitions**: See `lib/supabase/database.types.ts`

---

**Remember**: The database is perfect ✅. Only the application code needs updates. You're refactoring from JSON blob storage to a professional, normalized structure. Take it one step at a time!

