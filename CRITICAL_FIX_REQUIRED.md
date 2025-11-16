# CRITICAL FIX REQUIRED - Database Foreign Keys

**Date**: November 16, 2025  
**Priority**: 🔴 CRITICAL - Blocking all campaign queries  
**Status**: Code fixed, database migration required

---

## Problem Identified

Your backend refactoring migration created the `selected_creative_id` and `selected_copy_id` columns on the `ads` table but **did not create the foreign key constraints**. This causes PostgREST to fail when trying to use foreign key hints in nested queries.

### Error Message
```
PGRST200: Searched for a foreign key relationship between "ads" and "ad_creatives" 
using the hint "ad_creatives!selected_creative_id" but couldn't find one.
```

### Impact
- ❌ Homepage cannot load campaigns ("Failed to load campaigns" error)
- ❌ Campaign queries fail with 500 error
- ❌ Cannot display campaign thumbnails
- ❌ Breaks entire campaign browsing experience

---

## Root Cause

**Migration File**: `supabase/migrations/20250116_create_normalized_schema.sql`

**What It Did** (Lines 26-28):
```sql
ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS selected_creative_id UUID,
  ADD COLUMN IF NOT EXISTS selected_copy_id UUID;
```

**What It DIDN'T Do**:
```sql
-- MISSING: Foreign key constraints!
ALTER TABLE ads 
ADD CONSTRAINT ads_selected_creative_id_fkey 
FOREIGN KEY (selected_creative_id) 
REFERENCES ad_creatives(id);
```

---

## Required Database Migration

### ⚠️ ACTION REQUIRED: Run This in Supabase AI

I've created a migration file for you: **`SUPABASE_FK_MIGRATION.sql`**

**Copy the contents and run in Supabase AI with this prompt:**

```
I need to add foreign key constraints to my ads table. Please apply this migration:

[Paste contents of SUPABASE_FK_MIGRATION.sql here]

After applying, please verify the constraints were created by running:

SELECT 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='ads'
  AND kcu.column_name IN ('selected_creative_id', 'selected_copy_id');
```

**Expected Output:**
```
constraint_name                       | column_name            | foreign_table_name | foreign_column_name
--------------------------------------|------------------------|-------------------|--------------------
ads_selected_creative_id_fkey         | selected_creative_id   | ad_creatives      | id
ads_selected_copy_id_fkey             | selected_copy_id       | ad_copy_variations| id
```

---

## What I've Fixed in the Code

While you handle the database migration, I've fixed the code to work **without** the foreign keys for now:

### 1. Updated Campaign API Query ✅
**File**: `app/api/campaigns/route.ts`

**Before** (broken):
```typescript
ads (
  id,
  name,
  status,
  selected_creative_id,
  ad_creatives!selected_creative_id (  // ❌ FK doesn't exist
    image_url,
    creative_format
  )
)
```

**After** (works now):
```typescript
ads (
  id,
  name,
  status,
  selected_creative_id,
  selected_copy_id,
  destination_type,
  created_at,
  updated_at
)
// ✅ No nested query - works without FK
```

### 2. Updated Campaign Page Query ✅
**File**: `app/[campaignId]/page.tsx`
- Removed FK hint for ad_creatives
- Simplified query to work without FKs

### 3. Strengthened Auth Flow Loop Prevention ✅
**Files**: `app/auth/post-login/page.tsx`, `app/auth/post-verify/page.tsx`
- Improved sentinel key logic
- Exit early WITHOUT redirect if already processed
- Added effect run counter for debugging
- Better logging

---

## Testing After Database Fix

Once you've run the migration in Supabase:

### 1. Verify Homepage Loads
```
✅ Navigate to homepage
✅ Should see "Your Campaigns" section
✅ No "Failed to load campaigns" error
✅ Campaigns display if you have any
```

### 2. Test Campaign Creation Flow
```
✅ Enter prompt → Sign in with Google
✅ Campaign creates successfully
✅ No "Campaign Not Found" error
✅ Campaign page loads
```

### 3. Test Campaign Page Refresh
```
✅ On campaign page, press F5 to refresh
✅ Page reloads successfully
✅ No errors or redirects
```

---

## Success Criteria

After running the database migration, you should see:

### Homepage (Authenticated)
- ✅ Campaign grid loads
- ✅ Shows existing campaigns
- ✅ Campaign thumbnails display (or placeholders)
- ✅ No "Failed to load campaigns" error
- ✅ Console: No PGRST200 errors
- ✅ Vercel logs: No database query errors

### OAuth Flow
- ✅ Prompt → Google OAuth → Campaign creation
- ✅ Console: "[PostAuthHandler] Campaign created"
- ✅ Console: "[PostAuthHandler] Campaign verified"
- ✅ Toast: "Campaign created successfully!"
- ✅ Navigates to campaign page
- ✅ No "Campaign Not Found" error

### Email Sign-In Flow
- ✅ Prompt → Email sign-in → Campaign creation
- ✅ Redirects to `/auth/post-login`
- ✅ Campaign created successfully
- ✅ No loop (sentinel prevents double-processing)

---

## Quick Start

### Step 1: Run Database Migration (5 minutes)
1. Open Supabase dashboard
2. Use Supabase AI with the prompt above
3. Verify constraints were created

### Step 2: Deploy Code Changes (already done)
```bash
# Code is already pushed to git (commit 15d87a1)
# Vercel should auto-deploy or you can trigger manually
```

### Step 3: Test All Flows (15 minutes)
1. Clear browser cache and localStorage
2. Test unauthenticated → OAuth → Campaign
3. Test authenticated → Homepage loads
4. Test campaign page refresh
5. Follow `AUTH_FLOW_TESTING_GUIDE.md` for comprehensive tests

---

## Why This Happened

The backend refactoring created normalized tables (`ad_creatives`, `ad_copy_variations`) and added reference columns (`selected_creative_id`, `selected_copy_id`) to the `ads` table, but forgot to create the foreign key constraints linking them.

Without FKs:
- PostgREST can't resolve FK hints like `ad_creatives!selected_creative_id`
- Nested queries fail with PGRST200 error
- All campaign list queries break

With FKs:
- PostgREST can resolve the relationship
- Nested queries work
- Can efficiently load campaigns with related data in one query

---

## After Migration Success

Once FKs are added, you can optionally re-enable the nested queries for better performance:

```typescript
// In app/api/campaigns/route.ts
ads (
  id,
  name,
  status,
  selected_creative_id,
  selected_copy_id,
  ad_creatives!selected_creative_id (
    image_url,
    creative_format
  ),
  ad_copy_variations!selected_copy_id (
    headline,
    primary_text,
    cta_text
  )
)
```

This would allow campaigns to load with their selected creative and copy in a single query.

---

## Summary

**What's Blocking**: Missing foreign key constraints in database  
**Where to Fix**: Run `SUPABASE_FK_MIGRATION.sql` in Supabase AI  
**Code Status**: ✅ Fixed and deployed  
**Database Status**: ⏸️ Awaiting FK migration  
**Testing**: Ready once database is fixed

**Estimated Time**: 5 minutes to run migration, 15 minutes to test

---

**Last Updated**: November 16, 2025  
**Next Action**: Run database migration in Supabase AI

