# RLS Setup Instructions for Supabase

## Quick Start (3 Steps)

### Step 1: Check Current Status
1. Go to Supabase Dashboard → **SQL Editor**
2. Open and run: `check_current_rls_status.sql`
3. Review the output to see what's missing

### Step 2: Apply RLS Policies
1. In Supabase SQL Editor, open: `verify_and_setup_ads_rls.sql`
2. Run the entire script
3. Confirm you see "Success" messages

### Step 3: Verify Installation
1. Run `check_current_rls_status.sql` again
2. Confirm you see:
   - ✅ RLS Enabled = `true` for ads table
   - ✅ 4 policies listed (SELECT, INSERT, UPDATE, DELETE)

## Using Supabase AI (Alternative Method)

If you prefer to use Supabase AI assistant:

### Prompt 1: Check Status
```
Check if the 'ads' table has Row Level Security enabled and list all policies. 
Show me the policy names and what operations they cover (SELECT, INSERT, UPDATE, DELETE).
```

### Prompt 2: Apply Policies (if missing)
```
I need to set up RLS policies for the 'ads' table. Here are the requirements:

1. Enable RLS on the ads table
2. Create 4 policies:
   - SELECT: Allow users to read ads from their own campaigns
   - INSERT: Allow users to create ads in their own campaigns  
   - UPDATE: Allow users to update ads in their own campaigns
   - DELETE: Allow users to delete ads from their own campaigns

All policies should check that the campaign_id in ads matches a campaign where user_id = auth.uid().

Can you generate and execute the SQL to create these policies?
```

## Expected Results

After successful setup, you should see:

### RLS Status
```
tablename | RLS Enabled
----------|------------
ads       | true
```

### Policies List
```
Policy Name                                    | Operation
-----------------------------------------------|----------
Users can select ads from their own campaigns | SELECT
Users can insert ads to their own campaigns   | INSERT
Users can update their own ads                | UPDATE
Users can delete their own ads                | DELETE
```

## Testing the Setup

After applying policies, test by:

1. **Frontend Test:**
   - Create a new campaign from homepage
   - Check browser console for: "Created initial draft ad [ID]"
   - No Supabase permission errors should appear

2. **Database Test:**
   - Go to Supabase → **Table Editor** → `ads` table
   - Verify new ads appear with correct campaign_id and user ownership

3. **API Test:**
   ```bash
   # Test fetching ads (should work)
   curl -X GET https://your-project.supabase.co/rest/v1/ads \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_USER_JWT"
   ```

## Troubleshooting

### Issue: "Permission denied for table ads"
**Cause:** RLS is enabled but policies are missing  
**Fix:** Run `verify_and_setup_ads_rls.sql`

### Issue: "New row violates row-level security policy"
**Cause:** INSERT or UPDATE policy is missing  
**Fix:** Run `verify_and_setup_ads_rls.sql` (it includes WITH CHECK clauses)

### Issue: Policies exist but still getting errors
**Possible causes:**
1. Campaigns table might not have proper RLS policies
2. User authentication token might be invalid
3. Campaign ownership (user_id) doesn't match auth.uid()

**Debug steps:**
```sql
-- Check if you can see campaigns
SELECT id, user_id, name FROM campaigns WHERE user_id = auth.uid();

-- Check if auth.uid() returns your user ID
SELECT auth.uid();
```

## Files Reference

- `check_current_rls_status.sql` - Diagnostic queries to see current state
- `verify_and_setup_ads_rls.sql` - Complete setup script with all policies
- `/RLS_VERIFICATION_GUIDE.md` - Detailed explanation of each policy

## Related Documentation

- **Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Policies:** https://www.postgresql.org/docs/current/sql-createpolicy.html
- **Project API Routes:** `/app/api/v1/ads/route.ts`, `/app/api/v1/campaigns/route.ts`

