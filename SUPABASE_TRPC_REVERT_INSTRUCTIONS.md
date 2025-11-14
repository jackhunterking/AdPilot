# Supabase tRPC Migration Revert Instructions

## Overview
This document provides SQL commands to revert the 5 tRPC-related database migrations that were added on 2025-01-25. These migrations have been removed from the codebase, but if they were applied to your Supabase database, you'll need to manually revert them.

## Check if Migrations Were Applied

Run this query in your Supabase SQL Editor to check which migrations are currently applied:

```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20250125%' 
ORDER BY version DESC;
```

If you see any of these migrations:
- `20250125_add_comprehensive_rls_policies`
- `20250125_add_data_integrity_constraints`
- `20250125_add_performance_functions`
- `20250125_add_trpc_optimized_indexes`
- `20250125_enable_realtime_subscriptions`

Then you need to revert them using the SQL commands below.

---

## Revert Commands

### Important Notes:
1. **Run these in reverse chronological order** (newest to oldest)
2. **Backup your database before running** these commands
3. These commands will remove indexes, functions, constraints, and policies added by the tRPC migrations
4. Your data will remain intact - only the schema changes will be reverted

---

### Step 1: Revert Realtime Subscriptions (20250125_enable_realtime_subscriptions)

```sql
-- Disable realtime for all tables
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.campaigns;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.ads;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.ad_images;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.creative_variants;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.leads;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.publishing_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.meta_connections;

-- Remove the migration record
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20250125_enable_realtime_subscriptions';
```

---

### Step 2: Revert Optimized Indexes (20250125_add_trpc_optimized_indexes)

```sql
-- Drop all tRPC-optimized indexes
DROP INDEX IF EXISTS idx_campaigns_user_status;
DROP INDEX IF EXISTS idx_campaigns_user_created;
DROP INDEX IF EXISTS idx_campaigns_status_updated;
DROP INDEX IF EXISTS idx_ads_campaign_status;
DROP INDEX IF EXISTS idx_ads_campaign_created;
DROP INDEX IF EXISTS idx_ads_status_updated;
DROP INDEX IF EXISTS idx_ad_images_ad_created;
DROP INDEX IF EXISTS idx_creative_variants_ad_created;
DROP INDEX IF EXISTS idx_leads_user_created;
DROP INDEX IF EXISTS idx_leads_campaign_created;
DROP INDEX IF EXISTS idx_leads_ad_created;
DROP INDEX IF EXISTS idx_publishing_logs_ad_created;
DROP INDEX IF EXISTS idx_publishing_logs_campaign_created;
DROP INDEX IF EXISTS idx_publishing_logs_status_created;
DROP INDEX IF EXISTS idx_meta_connections_user_type;
DROP INDEX IF EXISTS idx_meta_connections_campaign_active;

-- Remove the migration record
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20250125_add_trpc_optimized_indexes';
```

---

### Step 3: Revert Performance Functions (20250125_add_performance_functions)

```sql
-- Drop all performance-related functions
DROP FUNCTION IF EXISTS get_campaign_with_ads(uuid);
DROP FUNCTION IF EXISTS get_campaign_summary(uuid);
DROP FUNCTION IF EXISTS get_user_campaigns_summary(uuid);
DROP FUNCTION IF EXISTS get_ad_with_details(uuid);
DROP FUNCTION IF EXISTS get_campaign_analytics(uuid, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_user_analytics(uuid, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS update_campaign_updated_at();
DROP FUNCTION IF EXISTS update_ad_updated_at();
DROP FUNCTION IF EXISTS validate_publishing_transition();

-- Drop triggers
DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
DROP TRIGGER IF EXISTS ads_updated_at ON ads;
DROP TRIGGER IF EXISTS validate_publishing_status ON publishing_logs;

-- Remove the migration record
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20250125_add_performance_functions';
```

---

### Step 4: Revert Data Integrity Constraints (20250125_add_data_integrity_constraints)

```sql
-- Drop check constraints on campaigns table
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_name_length;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_dates_check;

-- Drop check constraints on ads table
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_headline_length;
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_body_length;
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_cta_length;
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_status_check;
ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_budget_check;

-- Drop check constraints on ad_images table
ALTER TABLE ad_images DROP CONSTRAINT IF EXISTS ad_images_url_check;

-- Drop check constraints on creative_variants table
ALTER TABLE creative_variants DROP CONSTRAINT IF EXISTS creative_variants_headline_length;
ALTER TABLE creative_variants DROP CONSTRAINT IF EXISTS creative_variants_body_length;

-- Drop check constraints on leads table
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_email_format;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_phone_format;

-- Drop check constraints on publishing_logs table
ALTER TABLE publishing_logs DROP CONSTRAINT IF EXISTS publishing_logs_status_check;

-- Drop check constraints on meta_connections table
ALTER TABLE meta_connections DROP CONSTRAINT IF EXISTS meta_connections_type_check;

-- Remove NOT NULL constraints added by the migration
-- (Only if they didn't exist before - be careful with these)
-- ALTER TABLE campaigns ALTER COLUMN name DROP NOT NULL;
-- ALTER TABLE ads ALTER COLUMN headline DROP NOT NULL;
-- etc. (check your schema history before running these)

-- Remove the migration record
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20250125_add_data_integrity_constraints';
```

---

### Step 5: Revert Comprehensive RLS Policies (20250125_add_comprehensive_rls_policies)

```sql
-- Drop RLS policies on campaigns table
DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can create their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON campaigns;

-- Drop RLS policies on ads table
DROP POLICY IF EXISTS "Users can view ads for their campaigns" ON ads;
DROP POLICY IF EXISTS "Users can create ads for their campaigns" ON ads;
DROP POLICY IF EXISTS "Users can update ads for their campaigns" ON ads;
DROP POLICY IF EXISTS "Users can delete ads for their campaigns" ON ads;

-- Drop RLS policies on ad_images table
DROP POLICY IF EXISTS "Users can view images for their ads" ON ad_images;
DROP POLICY IF EXISTS "Users can create images for their ads" ON ad_images;
DROP POLICY IF EXISTS "Users can update images for their ads" ON ad_images;
DROP POLICY IF EXISTS "Users can delete images for their ads" ON ad_images;

-- Drop RLS policies on creative_variants table
DROP POLICY IF EXISTS "Users can view variants for their ads" ON creative_variants;
DROP POLICY IF EXISTS "Users can create variants for their ads" ON creative_variants;
DROP POLICY IF EXISTS "Users can update variants for their ads" ON creative_variants;
DROP POLICY IF EXISTS "Users can delete variants for their ads" ON creative_variants;

-- Drop RLS policies on leads table
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can create leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;

-- Drop RLS policies on publishing_logs table
DROP POLICY IF EXISTS "Users can view publishing logs for their ads" ON publishing_logs;
DROP POLICY IF EXISTS "Users can create publishing logs for their ads" ON publishing_logs;
DROP POLICY IF EXISTS "System can update publishing logs" ON publishing_logs;

-- Drop RLS policies on meta_connections table
DROP POLICY IF EXISTS "Users can view their own meta connections" ON meta_connections;
DROP POLICY IF EXISTS "Users can create their own meta connections" ON meta_connections;
DROP POLICY IF EXISTS "Users can update their own meta connections" ON meta_connections;
DROP POLICY IF EXISTS "Users can delete their own meta connections" ON meta_connections;

-- Note: You may want to keep RLS enabled on these tables if you had it enabled before
-- If you want to disable RLS entirely (not recommended for production):
-- ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ads DISABLE ROW LEVEL SECURITY;
-- etc.

-- Remove the migration record
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20250125_add_comprehensive_rls_policies';
```

---

## Verification

After running all revert commands, verify the migrations are gone:

```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20250125%' 
ORDER BY version DESC;
```

This should return 0 rows.

---

## Alternative: Manual Migration Table Cleanup

If the migrations were added to the migration tracking table but never actually applied to your database, you can simply remove them from the tracking table:

```sql
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN (
  '20250125_add_comprehensive_rls_policies',
  '20250125_add_data_integrity_constraints',
  '20250125_add_performance_functions',
  '20250125_add_trpc_optimized_indexes',
  '20250125_enable_realtime_subscriptions'
);
```

---

## Support

If you encounter any issues or need to verify which changes were actually applied to your database, please:

1. Take a full backup of your Supabase database
2. Review your existing schema using the Supabase dashboard
3. Compare with the revert commands above to identify what needs to be removed

**Important**: These revert commands are comprehensive and designed to remove all changes from the tRPC migrations. Your existing data and earlier migrations will remain intact.

