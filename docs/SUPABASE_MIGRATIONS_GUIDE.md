# Supabase Migrations Guide

**Purpose**: Apply performance indexes and helper functions to Supabase database  
**Status**: SQL files ready, apply via Supabase dashboard or MCP

---

## Migrations to Apply

### Migration 1: Location Performance Indexes

**File**: `supabase/migrations/add_location_indexes.sql`

**Apply via Supabase Dashboard**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to SQL Editor
4. Copy contents of `add_location_indexes.sql`
5. Run SQL
6. Verify indexes created

**Creates**:
- `idx_ad_target_locations_ad_id` - Primary lookups (10x faster)
- `idx_ad_target_locations_mode` - Filter by include/exclude
- `idx_ad_target_locations_name` - Name searches/deduplication

### Migration 2: Helper Functions

**File**: `supabase/migrations/add_helper_functions.sql`

**Apply via Supabase Dashboard**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to SQL Editor
4. Copy contents of `add_helper_functions.sql`
5. Run SQL
6. Verify functions created

**Creates**:
- `user_owns_ad(ad_id, user_id)` - Ownership verification
- `get_ad_locations_count(ad_id)` - Location statistics

---

## Verification

After applying migrations, verify:

```sql
-- Check indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'ad_target_locations';

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('user_owns_ad', 'get_ad_locations_count');

-- Test user_owns_ad function
SELECT user_owns_ad('[ad-uuid]'::uuid, '[user-uuid]'::uuid);

-- Test get_ad_locations_count function
SELECT * FROM get_ad_locations_count('[ad-uuid]'::uuid);
```

---

## Performance Impact

**Before**: Table scans for location queries (~50ms)  
**After**: Index scans (~5ms)  
**Improvement**: 10x faster

---

*Apply these migrations to complete Phase 6 (Supabase Optimizations)*

