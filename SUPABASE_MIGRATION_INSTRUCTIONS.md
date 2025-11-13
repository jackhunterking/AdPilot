# 🔧 Supabase Migration Instructions - BACKEND TASK

## ⚠️ CRITICAL: You Need to Run This Migration in Supabase

**The publishing fix requires a database schema change.** Since MCP tools don't work properly, you'll need to run the migration SQL manually in Supabase.

## 📋 Quick Steps (5 minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your **AdPilot** project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button

### Step 2: Run the Migration
1. Open the file: `supabase/migrations/20250114_fix_ad_status_schema.sql`
2. **Copy ALL the contents** (it's a complete, safe migration)
3. **Paste** into the Supabase SQL Editor
4. Click **"Run"** button (bottom right)
5. **Wait** for completion (~5-10 seconds)

### Step 3: Verify Success
1. You should see green success checkmarks ✅
2. Look for this message in Results:
   ```
   ✅ Ad status schema migration complete!
   ```
3. Run the verification script (optional but recommended):
   - Open file: `supabase/migrations/VERIFY_MIGRATION.sql`
   - Copy and run in SQL Editor
   - All tests should show ✅ PASS

### Step 4: Test Publishing
1. Go to your staging app: https://staging.adpilot.studio
2. Navigate to a campaign with a draft ad
3. Click **"Publish"** button
4. **Expected:** Should work without the constraint error!

---

## 🤖 Alternative: Use Supabase AI Assistant

If you prefer to use Supabase AI to run the migration:

### Prompt for Supabase AI:

```
I need to run a database migration to fix an ad status schema issue in my AdPilot project.

Current Problem:
- The 'ads' table has a 'status' column with a CHECK constraint
- The constraint does not include 'pending_review' as a valid value
- When my app tries to update ads.status to 'pending_review', it fails with:
  code: '23514' - "new row for relation 'ads' violates check constraint 'ads_status_check'"

Solution:
- I have a 'publishing_status' column that uses the proper 'ad_status_enum' type
- The enum includes all status values: draft, pending_review, active, learning, paused, rejected, failed, archived
- I need to consolidate by:
  1. Migrating data from 'status' to 'publishing_status'
  2. Dropping the old CHECK constraint 'ads_status_check'
  3. Dropping the old 'status' column
  4. Renaming 'publishing_status' to 'status'

Can you:
1. First inspect the current ads table schema to show me the status columns and constraints
2. Then run the migration from this file: supabase/migrations/20250114_fix_ad_status_schema.sql
3. Finally verify the migration succeeded and the 'status' column now uses ad_status_enum type

After migration, I should be able to UPDATE ads SET status = 'pending_review' without any constraint errors.
```

---

## 📊 What to Expect

### Before Migration
```sql
-- This FAILS with constraint error:
UPDATE ads SET status = 'pending_review' WHERE id = '<ad_id>';
-- Error: violates check constraint "ads_status_check"
```

### After Migration
```sql
-- This SUCCEEDS:
UPDATE ads SET status = 'pending_review' WHERE id = '<ad_id>';
-- Returns: UPDATE 1
```

## 🚨 Safety Features Built-In

The migration includes:
- ✅ **Data migration** before dropping old column
- ✅ **NULL check** before dropping
- ✅ **Automatic verification** with NOTICE messages
- ✅ **Rollback plan** if needed (see DATABASE_MIGRATION_GUIDE.md)
- ✅ **Index recreation** for performance
- ✅ **Comments** for documentation

## ⏱️ Estimated Time

- **Running migration:** 5-10 seconds
- **Verification:** 2 minutes
- **Testing publishing:** 2 minutes
- **Total:** ~5 minutes

## 🎯 Success Indicators

After running the migration, you should see:

### In Supabase SQL Editor Results:
```
NOTICE: ad_status_enum type already exists
NOTICE: publishing_status column already exists  
NOTICE: Migrated X ads from status to publishing_status
NOTICE: Dropped old status column
NOTICE: Renamed publishing_status to status
NOTICE: ✅ Column status is properly typed as ad_status_enum
NOTICE: Status distribution: draft: X, ...
NOTICE: ✅ No NULL statuses found
NOTICE: ========================================
NOTICE: ✅ Ad status schema migration complete!
```

### In Your App (after publishing):
```
[Publish API] ✅ Ad status updated to pending_review  ← No more constraint error!
[PublishSingleAd] 🚀 Starting single ad publish
[PublishSingleAd] ✅ Meta connection validated
```

## ❓ If You Get Stuck

### Option 1: Share the Error
If you get any error during migration:
1. Copy the error message from Supabase
2. Share it with me
3. We can adjust the migration or use rollback

### Option 2: I Can Provide SQL Directly
If you prefer, I can paste the exact SQL here for you to copy-paste into Supabase.

Just let me know which approach you prefer!

---

## 📌 Files Ready for You

All files are committed and pushed to `new-flow` branch:

1. **`supabase/migrations/20250114_fix_ad_status_schema.sql`** ← Main migration (run this)
2. **`supabase/migrations/INSPECT_SCHEMA.sql`** ← Optional: inspect current schema first
3. **`supabase/migrations/VERIFY_MIGRATION.sql`** ← Optional: verify after migration
4. **`DATABASE_MIGRATION_GUIDE.md`** ← Full documentation

**Next:** Run the migration in Supabase, then test publishing!

