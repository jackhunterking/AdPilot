# RLS Policy Verification Guide

## Purpose
Verify that Row Level Security (RLS) policies are properly configured for the `ads` table to allow authenticated users to create and manage their ads.

## Steps to Verify in Supabase Dashboard

### 1. Access Supabase Dashboard
- Navigate to: https://supabase.com/dashboard
- Select your AdPilot project
- Go to: **Authentication** → **Policies**
- Select the `ads` table from the dropdown

### 2. Required Policies for `ads` Table

You should have the following 4 policies configured:

#### Policy 1: SELECT (Read)
```sql
CREATE POLICY "Users can select ads from their own campaigns"
ON ads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);
```

**What it does:** Allows users to view ads that belong to their campaigns.

#### Policy 2: INSERT (Create)
```sql
CREATE POLICY "Users can insert ads to their own campaigns"
ON ads FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);
```

**What it does:** Allows users to create new ads in their own campaigns.
**Critical:** This policy is required for draft ad creation to work.

#### Policy 3: UPDATE (Modify)
```sql
CREATE POLICY "Users can update their own ads"
ON ads FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);
```

**What it does:** Allows users to update ads in their campaigns.

#### Policy 4: DELETE (Remove)
```sql
CREATE POLICY "Users can delete their own ads"
ON ads FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);
```

**What it does:** Allows users to delete ads from their campaigns.

### 3. Enable RLS

Ensure RLS is enabled on the `ads` table:
```sql
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
```

### 4. How to Add Missing Policies

If any policies are missing:

1. In Supabase Dashboard, go to **SQL Editor**
2. Create a new query
3. Copy and paste all 5 SQL statements above (4 policies + enable RLS)
4. Run the query
5. Verify policies appear in the **Authentication** → **Policies** section

### 5. Test Verification

After ensuring policies exist, test by:

1. Creating a new campaign from the homepage
2. Check browser console for:
   - ✅ `Created initial draft ad [ID]` 
   - ❌ No Supabase permission errors
3. Verify the ad appears in Supabase **Table Editor** → `ads` table

## Common Issues

### Issue: Draft ads not being created
**Symptom:** Console shows Supabase error with code `42501` (insufficient privilege)
**Solution:** Add the INSERT policy (Policy 2 above)

### Issue: Can't fetch ads
**Symptom:** "Response missing ads array" or empty ads list
**Solution:** Add the SELECT policy (Policy 1 above)

### Issue: Can't update or delete ads
**Symptom:** 403 or permission denied errors
**Solution:** Add UPDATE and DELETE policies (Policies 3 & 4 above)

## Related Files
- `/app/api/v1/campaigns/route.ts` - Creates draft ads (lines 186-215)
- `/app/api/v1/ads/route.ts` - Ads CRUD operations
- `/lib/hooks/use-campaign-ads.ts` - Fetches ads for UI

## Next Steps After Verification

Once RLS policies are confirmed:
1. Test the complete user journey (see todo #5)
2. Verify draft ad creation works from homepage
3. Confirm image generation works without errors

