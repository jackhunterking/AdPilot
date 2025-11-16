-- Migration: Drop Deprecated Tables and JSON Columns
-- Purpose: Clean up old JSON blob storage after successful migration
-- Date: 2025-01-16
-- References:
--  - Backend Refactoring Plan V2

-- ============================================================================
-- PHASE 3: DROP OLD TABLES AND JSON COLUMNS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Dropping deprecated tables...';
END $$;

-- Drop unused/deprecated tables (0 rows, no longer needed)
DROP TABLE IF EXISTS campaign_states CASCADE;
DROP TABLE IF EXISTS copy_variants CASCADE;
DROP TABLE IF EXISTS creative_variants CASCADE;
DROP TABLE IF EXISTS location_sets CASCADE;
DROP TABLE IF EXISTS meta_asset_snapshots CASCADE;
DROP TABLE IF EXISTS creative_plans CASCADE;
DROP TABLE IF EXISTS creative_lint_reports CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS experiment_variants CASCADE;
DROP TABLE IF EXISTS insights_snapshots CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS meta_connections CASCADE;

-- Remove JSON blob columns from ads table (data now in normalized tables)
ALTER TABLE ads
  DROP COLUMN IF EXISTS setup_snapshot CASCADE,
  DROP COLUMN IF EXISTS creative_data CASCADE,
  DROP COLUMN IF EXISTS copy_data CASCADE,
  DROP COLUMN IF EXISTS destination_data CASCADE;

-- Clean up campaigns table - remove unused columns
ALTER TABLE campaigns
  DROP COLUMN IF EXISTS current_step CASCADE,
  DROP COLUMN IF EXISTS total_steps CASCADE,
  DROP COLUMN IF EXISTS metadata CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_tables TEXT[];
BEGIN
  -- List remaining tables
  SELECT array_agg(tablename ORDER BY tablename)
  INTO v_tables
  FROM pg_tables
  WHERE schemaname = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Cleanup completed successfully!';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Dropped tables:';
  RAISE NOTICE '  - campaign_states (JSON blobs)';
  RAISE NOTICE '  - copy_variants, creative_variants, location_sets';
  RAISE NOTICE '  - meta_asset_snapshots';
  RAISE NOTICE '  - creative_plans, creative_lint_reports';
  RAISE NOTICE '  - experiments, experiment_variants';
  RAISE NOTICE '  - insights_snapshots, leads, meta_connections';
  RAISE NOTICE '';
  RAISE NOTICE 'Removed columns from ads table:';
  RAISE NOTICE '  - setup_snapshot, creative_data, copy_data, destination_data';
  RAISE NOTICE '';
  RAISE NOTICE 'Database is now lean and normalized!';
  RAISE NOTICE 'Total active tables: %', array_length(v_tables, 1);
END $$;

