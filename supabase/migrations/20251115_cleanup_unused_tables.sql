-- Migration: Clean up unused tables and deprecated columns
-- Purpose: Remove redundant location storage and unused tables to make database lean
-- Date: 2025-11-15
-- Part 1: Remove Unused Tables

-- Drop location_sets table (0 records, completely unused)
-- Location data is now stored in ads.setup_snapshot.location only
DROP TABLE IF EXISTS location_sets CASCADE;

-- Drop creative_variants table (0 records, data now in ads.setup_snapshot.creative)
DROP TABLE IF EXISTS creative_variants CASCADE;

-- Drop copy_variants table (0 records, data now in ads.setup_snapshot.copy)
DROP TABLE IF EXISTS copy_variants CASCADE;

-- Drop meta_asset_snapshots table (0 records, unused)
DROP TABLE IF EXISTS meta_asset_snapshots CASCADE;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Cleanup Migration Complete';
  RAISE NOTICE 'Removed tables:';
  RAISE NOTICE '  - location_sets';
  RAISE NOTICE '  - creative_variants';
  RAISE NOTICE '  - copy_variants';
  RAISE NOTICE '  - meta_asset_snapshots';
  RAISE NOTICE '';
  RAISE NOTICE 'Schema is now leaner and more maintainable';
END $$;

