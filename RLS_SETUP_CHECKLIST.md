# ✅ RLS Setup Checklist - Execute in Supabase

## 🎯 Goal
Ensure the `ads` table has proper Row Level Security policies so users can create and manage their ads.

## 📋 Execution Steps

### Option A: Using Supabase SQL Editor (Recommended)

#### Step 1: Check Current Status (2 minutes)
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your AdPilot project
3. Navigate to: **SQL Editor**
4. Click "New Query"
5. Open file: `/supabase/migrations/check_current_rls_status.sql`
6. Copy all content and paste into SQL Editor
7. Click "Run"
8. **Record the results** (you'll need this to compare)

**Expected Issues to Look For:**
- ❌ RLS Enabled = `false` (needs to be `true`)
- ❌ Less than 4 policies (need 4 total: SELECT, INSERT, UPDATE, DELETE)
- ❌ No policies at all (need to create all 4)

---

#### Step 2: Apply RLS Policies (3 minutes)
1. Still in **SQL Editor**, click "New Query"
2. Open file: `/supabase/migrations/verify_and_setup_ads_rls.sql`
3. Copy all content and paste into SQL Editor
4. Click "Run"
5. Watch for success messages (should see multiple "CREATE POLICY" confirmations)

**What This Does:**
- ✅ Enables RLS on the `ads` table
- ✅ Drops any conflicting old policies
- ✅ Creates 4 new policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Each policy ensures users can only access ads from their own campaigns

---

#### Step 3: Verify Installation (1 minute)
1. Run the `check_current_rls_status.sql` query again (from Step 1)
2. Confirm you now see:
   ```
   ✅ RLS Enabled = true
   ✅ 4 policies listed:
      - Users can select ads from their own campaigns (SELECT)
      - Users can insert ads to their own campaigns (INSERT)
      - Users can update their own ads (UPDATE)
      - Users can delete their own ads (DELETE)
   ```

---

### Option B: Using Supabase AI (If you prefer)

#### Prompt 1: Status Check
Paste this into Supabase AI chat:
```
Please check the current RLS status for the 'ads' table:
1. Is RLS enabled?
2. What policies currently exist?
3. List the policy names and operations (SELECT, INSERT, UPDATE, DELETE)

Run these queries:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ads';
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ads';
```

#### Prompt 2: Apply Policies
Paste this into Supabase AI chat:
```
I need you to set up RLS policies for the 'ads' table. Please execute the following:

1. Enable RLS: ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

2. Create SELECT policy:
CREATE POLICY "Users can select ads from their own campaigns" ON ads FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = ads.campaign_id AND campaigns.user_id = auth.uid()));

3. Create INSERT policy:
CREATE POLICY "Users can insert ads to their own campaigns" ON ads FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = ads.campaign_id AND campaigns.user_id = auth.uid()));

4. Create UPDATE policy:
CREATE POLICY "Users can update their own ads" ON ads FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = ads.campaign_id AND campaigns.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = ads.campaign_id AND campaigns.user_id = auth.uid()));

5. Create DELETE policy:
CREATE POLICY "Users can delete their own ads" ON ads FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = ads.campaign_id AND campaigns.user_id = auth.uid()));

Please execute all 5 statements and confirm they were successful.
```

#### Prompt 3: Verify
```
Please verify the policies were created:
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ads' ORDER BY cmd;

I should see 4 policies (DELETE, INSERT, SELECT, UPDATE).
```

---

## 🧪 Testing After Setup

### Test 1: Frontend Test (5 minutes)
1. Open your AdPilot app: http://localhost:3000 (or your deployed URL)
2. Log in with your account
3. Click "Create New Campaign"
4. Open browser DevTools (F12) → Console tab
5. **Look for:**
   - ✅ `"Created initial draft ad"` with an ID
   - ✅ No Supabase errors
   - ❌ NO errors like "permission denied" or "RLS policy violation"

### Test 2: Database Verification (2 minutes)
1. Go to Supabase Dashboard → **Table Editor**
2. Select `ads` table
3. Look for the newly created draft ad:
   - ✅ Has a `campaign_id` matching your new campaign
   - ✅ `status` = `"draft"`
   - ✅ Row exists and is visible

### Test 3: API Test (Optional - for advanced users)
```bash
# Get your user JWT from browser localStorage
# Then test the ads endpoint:
curl -X GET "https://[YOUR_PROJECT].supabase.co/rest/v1/ads?select=*" \
  -H "apikey: [YOUR_ANON_KEY]" \
  -H "Authorization: Bearer [YOUR_JWT]"

# Should return your ads in JSON format
```

---

## 🚨 Troubleshooting

### Problem: "Permission denied for table ads"
**Cause:** RLS is enabled but policies don't exist  
**Fix:** Run Step 2 (verify_and_setup_ads_rls.sql)

### Problem: "New row violates row-level security policy"
**Cause:** INSERT policy missing or misconfigured  
**Fix:** Run Step 2 again, ensure INSERT policy is created

### Problem: Draft ad creation fails in app
**Symptoms:**
- Console error: "Failed to create campaign"
- Supabase error code `42501` (insufficient privilege)

**Debug Steps:**
1. Check if you're logged in (auth token exists)
2. Verify campaign ownership (campaigns.user_id = your user ID)
3. Run Step 1 again to check if all 4 policies exist
4. Check if `campaigns` table also has RLS policies

### Problem: Can see ads but can't create them
**Cause:** SELECT policy works but INSERT policy is missing  
**Fix:** 
```sql
-- Run just the INSERT policy:
CREATE POLICY "Users can insert ads to their own campaigns" ON ads FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = ads.campaign_id AND campaigns.user_id = auth.uid()));
```

---

## 📚 Reference Files

Created for you in `/supabase/migrations/`:
- ✅ `check_current_rls_status.sql` - Diagnostic queries
- ✅ `verify_and_setup_ads_rls.sql` - Complete setup script  
- ✅ `RLS_SETUP_INSTRUCTIONS.md` - Detailed instructions

Original guide:
- `/RLS_VERIFICATION_GUIDE.md` - Policy explanations

---

## ✅ Success Criteria

You're done when:
- [✅] RLS is enabled on `ads` table
- [✅] 4 policies exist (SELECT, INSERT, UPDATE, DELETE)
- [✅] Frontend can create campaigns with draft ads
- [✅] No permission errors in browser console
- [✅] Ads appear in Supabase Table Editor

---

## 🆘 Need Help?

If you encounter issues:
1. Copy the error message from browser console
2. Run the diagnostic queries in Step 1
3. Check which policies are missing
4. Re-run the specific policy creation SQL

**Common Fix:** Just re-run the entire `verify_and_setup_ads_rls.sql` script - it's safe to run multiple times!

