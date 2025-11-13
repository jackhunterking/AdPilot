# Database Migration Guide: Fix Ad Status Schema

## ⚠️ IMPORTANT: Backend Task - Run in Supabase

**This is a backend/database task.** You'll need to run the migration SQL in Supabase's SQL Editor.

## Quick Start

### Option 1: Run Migration Directly (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your AdPilot project
   - Click "SQL Editor" in the left sidebar

2. **Copy the Migration SQL**
   - Open file: `supabase/migrations/20250114_fix_ad_status_schema.sql`
   - Copy all contents

3. **Run in SQL Editor**
   - Paste the SQL into a new query
   - Click "Run" button
   - Watch for success messages in the Results panel

4. **Verify Success**
   - Look for green checkmark and success messages
   - Should see: `✅ Ad status schema migration complete!`
   - Check status distribution in results

### Option 2: Inspect Schema First (Safer)

If you want to see the current state before migrating:

1. **Run Inspection Queries**
   - Open file: `supabase/migrations/INSPECT_SCHEMA.sql`
   - Copy and run in Supabase SQL Editor
   - Review the results to understand current schema

2. **Save Inspection Results**
   - Copy the results to a text file for reference
   - This will help if you need to rollback

3. **Then Run Migration**
   - Follow Option 1 steps above

## What This Migration Does

### Before Migration
```
ads table:
  - status (TEXT with CHECK constraint)
    └─ Constraint: status IN ('draft', 'active', 'learning', 'paused', 'rejected', 'failed', 'archived')
    └─ ❌ Does NOT include 'pending_review'
  
  - publishing_status (ad_status_enum)
    └─ ✅ Includes all statuses including 'pending_review'
    └─ Not being used by application code
```

### After Migration
```
ads table:
  - status (ad_status_enum) ← Renamed from publishing_status
    └─ ✅ Includes ALL statuses: draft, pending_review, active, learning, paused, rejected, failed, archived
    └─ ✅ Proper PostgreSQL ENUM type (faster, type-safe)
    └─ ✅ Used by all application code
```

### Migration Steps (Automated)
1. ✅ Ensure `ad_status_enum` type exists with all values
2. ✅ Ensure `publishing_status` column exists
3. ✅ Migrate all data from `status` → `publishing_status`
4. ✅ Drop old CHECK constraint `ads_status_check`
5. ✅ Drop old `status` column
6. ✅ Rename `publishing_status` → `status`
7. ✅ Set default value to 'draft'
8. ✅ Make column NOT NULL
9. ✅ Recreate indexes
10. ✅ Verify migration success

## Expected Results

### During Migration
You should see these NOTICE messages:
```
NOTICE: ad_status_enum type already exists
NOTICE: publishing_status column already exists
NOTICE: Migrated X ads from status to publishing_status
NOTICE: Dropped old status column
NOTICE: Renamed publishing_status to status
NOTICE: ✅ Column status is properly typed as ad_status_enum
NOTICE: Status distribution: draft: X, pending_review: X, active: X...
NOTICE: ✅ No NULL statuses found
NOTICE: ========================================
NOTICE: ✅ Ad status schema migration complete!
```

### After Migration
Running this query:
```sql
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'ads' AND column_name = 'status';
```

Should return:
```
column_name | data_type    | udt_name
------------|--------------|----------------
status      | USER-DEFINED | ad_status_enum
```

## Verification Queries

After running the migration, verify it worked:

```sql
-- 1. Check column type
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'ads' AND column_name = 'status';

-- 2. Check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'ad_status_enum'::regtype 
ORDER BY enumsortorder;

-- 3. Check status distribution
SELECT status, COUNT(*) as count
FROM ads 
GROUP BY status 
ORDER BY count DESC;

-- 4. Verify no NULLs
SELECT COUNT(*) as null_count FROM ads WHERE status IS NULL;

-- 5. Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ads' AND indexdef LIKE '%status%';
```

## Rollback Plan (If Needed)

If something goes wrong, you can rollback with this SQL:

```sql
-- ROLLBACK: Restore old schema
-- WARNING: Only use if migration failed!

-- Step 1: Rename current status to publishing_status
ALTER TABLE ads RENAME COLUMN status TO publishing_status;

-- Step 2: Add old status column back
ALTER TABLE ads ADD COLUMN status TEXT DEFAULT 'draft';

-- Step 3: Copy data back
UPDATE ads SET status = publishing_status::text;

-- Step 4: Recreate CHECK constraint
ALTER TABLE ads ADD CONSTRAINT ads_status_check 
CHECK (status IN ('draft', 'active', 'learning', 'paused', 'rejected', 'failed', 'archived'));

-- Step 5: Make NOT NULL
ALTER TABLE ads ALTER COLUMN status SET NOT NULL;

-- Step 6: Recreate index
CREATE INDEX idx_ads_status ON ads(status);
```

## Post-Migration Testing

### Test 1: Create Ad
```sql
-- Should work fine
INSERT INTO ads (campaign_id, name, status, user_id)
VALUES ('<campaign_id>', 'Test Ad', 'draft', '<user_id>');
```

### Test 2: Update to pending_review
```sql
-- This should now work (was failing before)
UPDATE ads 
SET status = 'pending_review'
WHERE id = '<ad_id>';

-- Verify
SELECT id, name, status FROM ads WHERE id = '<ad_id>';
```

### Test 3: All Status Values
```sql
-- Test all possible transitions
UPDATE ads SET status = 'draft' WHERE id = '<ad_id>';
UPDATE ads SET status = 'pending_review' WHERE id = '<ad_id>';
UPDATE ads SET status = 'active' WHERE id = '<ad_id>';
UPDATE ads SET status = 'learning' WHERE id = '<ad_id>';
UPDATE ads SET status = 'paused' WHERE id = '<ad_id>';
UPDATE ads SET status = 'rejected' WHERE id = '<ad_id>';
UPDATE ads SET status = 'failed' WHERE id = '<ad_id>';
UPDATE ads SET status = 'archived' WHERE id = '<ad_id>';

-- All should succeed without constraint errors
```

## After Migration: Test Publishing Flow

1. **Refresh your staging app** (Vercel should auto-deploy from git)

2. **Try publishing an ad**
   - Navigate to a campaign with a draft ad
   - Click "Publish" button
   - Click "Confirm & Publish"

3. **Check Vercel Logs**
   - Should see: `[Publish API] ✅ Ad status updated to pending_review`
   - Should NOT see: `code: '23514'` constraint error
   - Should proceed to Meta API calls

4. **Expected Flow**
   ```
   [Publish API] 📥 Received publish request
   [Publish API] ✅ User authenticated
   [Publish API] ✅ Pre-flight validation passed
   [Publish API] ✅ Ad status updated to pending_review  ← This should work now!
   [PublishSingleAd] 🚀 Starting single ad publish
   [PublishSingleAd] ✅ Meta connection validated
   [PublishSingleAd] 📤 STEP 7: Uploading image to Meta...
   ... etc
   ```

## Troubleshooting

### Error: "column 'publishing_status' does not exist"

**Cause:** The 2nd migration (`20250114_add_publishing_status_system.sql`) didn't run

**Fix:**
1. Run the previous migration first:
   ```sql
   -- Run content from: supabase/migrations/20250114_add_publishing_status_system.sql
   ```
2. Then run this fix migration

### Error: "type 'ad_status_enum' does not exist"

**Cause:** Enum type wasn't created

**Fix:** The migration includes a fallback to create it, but verify with:
```sql
CREATE TYPE ad_status_enum AS ENUM (
  'draft', 'pending_review', 'active', 'paused', 
  'rejected', 'failed', 'learning', 'archived'
);
```

### Error: "some row values violate constraints"

**Cause:** Some ads have status values not in the CASE statement

**Fix:** Check current values:
```sql
SELECT DISTINCT status FROM ads;
```

Add missing mappings to Step 3 of the migration.

## Success Checklist

After running migration:

- [ ] No errors in SQL Editor
- [ ] See success messages in Results
- [ ] Verification queries pass
- [ ] `ads.status` column is `ad_status_enum` type
- [ ] Can update status to 'pending_review' without errors
- [ ] Application builds successfully in Vercel
- [ ] Publishing flow works end-to-end

## Next Steps

Once migration is complete:

1. ✅ Push changes to git (already done)
2. ⏳ **Run migration in Supabase** ← YOU ARE HERE
3. ⏳ Verify migration success
4. ⏳ Test publishing flow
5. ⏳ Monitor for 24 hours

## Support

If you encounter any issues during migration:

1. **Don't panic** - We have a rollback plan
2. **Copy the error message** from Supabase
3. **Check if data is intact** with verification queries
4. **Run rollback if needed** (see Rollback Plan section)

The migration is designed to be safe and reversible!

