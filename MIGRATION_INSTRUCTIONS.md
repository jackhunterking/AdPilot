# Migration Instructions

## Step 1: Run the Supabase Migration

You need to add the `setup_snapshot` column to your `ads` table. Here are your options:

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `supabase/migrations/20250111_add_setup_snapshot_to_ads.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`
6. Verify success: You should see "Success. No rows returned"

### Option B: Via Supabase AI (Using MCP Tool)

If you have the Supabase MCP tool configured and want me to help with the migration:

1. Tell me your project ID
2. I can apply the migration using the MCP tool
3. We'll verify it together

### Option C: Via Supabase CLI (For Local Development)

If you're using local Supabase development:

```bash
# Start local Supabase (if not already running)
supabase start

# The migration file is already in supabase/migrations/
# Apply pending migrations
supabase db push

# Or reset and apply all migrations
supabase db reset
```

## Step 2: Verify Migration Success

After running the migration, verify the column was added:

### Via SQL Editor:
```sql
-- Check the ads table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ads' AND column_name = 'setup_snapshot';

-- Should return:
-- column_name: setup_snapshot
-- data_type: jsonb
-- is_nullable: YES
```

### Via Table Editor:
1. Go to **Table Editor** in Supabase dashboard
2. Select the `ads` table
3. Scroll to see the new `setup_snapshot` column

## Step 3: Deploy Your Code

Once the migration is complete, deploy your updated code:

```bash
# Install dependencies (if needed)
npm install

# Run local dev server to test
npm run dev

# When ready, commit and push
git add .
git commit -m "Add ad edit hydration with snapshot support"
git push

# Deploy to Vercel (or your platform)
# The deployment will automatically use the new schema
```

## Step 4: Test the Changes

Follow the testing checklist in `IMPLEMENTATION_SUMMARY.md`:

1. **Test fresh ad creation** - Create a new ad and verify it saves with a snapshot
2. **Test ad editing** - Edit an existing ad and verify all fields load correctly
3. **Test legacy ads** - Edit an old ad (created before this update) and verify fallback works
4. **Test rapid switching** - Switch between editing different ads quickly

## Troubleshooting

### Error: "column 'setup_snapshot' does not exist"
- The migration hasn't been run yet
- Run the migration following Step 1 above

### Error: "permission denied for table ads"
- You need admin/service role permissions
- Run the migration using the Supabase dashboard (which uses elevated permissions)

### Warning: "Invalid snapshot structure"
- This is normal for legacy ads without snapshots
- The system will fall back to legacy data loading
- Save the ad once to create a proper snapshot for future edits

### Creative/Copy not showing in edit mode
- Check browser console for error messages
- Look for `[edit_ad_XXXXXX]` log entries
- Verify the ad has either a `setup_snapshot` or `creative_data`/`copy_data`
- Check that the migration was successful

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove the column (WARNING: This deletes all snapshot data)
ALTER TABLE ads DROP COLUMN IF EXISTS setup_snapshot;

-- Remove the index
DROP INDEX IF EXISTS idx_ads_setup_snapshot;
```

**Note**: Rollback is NOT recommended as it will delete snapshot data. The column is nullable and backward compatible, so there's minimal risk in keeping it.

## Next Steps

After successful migration:
1. Monitor application logs for any errors
2. Test editing a few different ads
3. Create new ads to verify snapshot creation works
4. Check Sentry/error tracking for any issues
5. Consider backfilling snapshots for important legacy ads (optional)

## Support

If you encounter issues:
1. Check the browser console for detailed logs
2. Review `IMPLEMENTATION_SUMMARY.md` for implementation details
3. Check Supabase logs for database errors
4. Let me know and I can help debug further

