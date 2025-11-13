-- ============================================================================
-- Migration: Fix Ad Status Schema
-- Purpose: Consolidate status columns and fix constraint to support all status values
-- Date: 2025-01-14
-- References: https://supabase.com/docs/guides/database/tables
-- 
-- IMPORTANT: This migration consolidates the old 'status' column (with CHECK constraint)
--            into the properly-typed 'publishing_status' enum column, then renames it
--            back to 'status' for clean API usage.
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify ad_status_enum exists (should have been created in earlier migration)
-- ============================================================================

DO $$ 
BEGIN
  -- Ensure the enum type exists with all required values
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ad_status_enum') THEN
    CREATE TYPE ad_status_enum AS ENUM (
      'draft',
      'pending_review',
      'active',
      'paused',
      'rejected',
      'failed',
      'learning',
      'archived'
    );
    RAISE NOTICE 'Created ad_status_enum type';
  ELSE
    RAISE NOTICE 'ad_status_enum type already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Ensure publishing_status column exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'ads' 
      AND column_name = 'publishing_status'
  ) THEN
    ALTER TABLE ads ADD COLUMN publishing_status ad_status_enum DEFAULT 'draft';
    RAISE NOTICE 'Added publishing_status column';
  ELSE
    RAISE NOTICE 'publishing_status column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Migrate data from status to publishing_status
-- ============================================================================

-- Sync all data from old status column to publishing_status
UPDATE ads 
SET publishing_status = CASE 
  WHEN status = 'draft' THEN 'draft'::ad_status_enum
  WHEN status = 'pending_review' THEN 'pending_review'::ad_status_enum
  WHEN status = 'pending_approval' THEN 'pending_review'::ad_status_enum
  WHEN status = 'active' THEN 'active'::ad_status_enum
  WHEN status = 'learning' THEN 'learning'::ad_status_enum
  WHEN status = 'paused' THEN 'paused'::ad_status_enum
  WHEN status = 'rejected' THEN 'rejected'::ad_status_enum
  WHEN status = 'failed' THEN 'failed'::ad_status_enum
  WHEN status = 'archived' THEN 'archived'::ad_status_enum
  ELSE 'draft'::ad_status_enum
END
WHERE publishing_status IS NULL 
   OR publishing_status::text != status;

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM ads;
  RAISE NOTICE 'Migrated % ads from status to publishing_status', migrated_count;
END $$;

-- ============================================================================
-- STEP 4: Drop the old CHECK constraint on status column
-- ============================================================================

ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_status_check;

-- ============================================================================
-- STEP 5: Drop the old status column
-- ============================================================================

DO $$ 
BEGIN
  -- Verify publishing_status has data before dropping status
  IF EXISTS (
    SELECT 1 FROM ads WHERE publishing_status IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot drop status column: publishing_status has NULL values';
  END IF;
  
  -- Safe to drop old status column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'ads' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE ads DROP COLUMN status;
    RAISE NOTICE 'Dropped old status column';
  ELSE
    RAISE NOTICE 'Old status column already dropped';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Rename publishing_status to status
-- ============================================================================

DO $$
BEGIN
  -- Check if publishing_status exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'ads' 
      AND column_name = 'publishing_status'
  ) THEN
    -- Rename it to status
    ALTER TABLE ads RENAME COLUMN publishing_status TO status;
    RAISE NOTICE 'Renamed publishing_status to status';
  ELSE
    RAISE NOTICE 'Column already renamed or does not exist';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Set column defaults and constraints
-- ============================================================================

-- Set default value
ALTER TABLE ads ALTER COLUMN status SET DEFAULT 'draft'::ad_status_enum;

-- Make NOT NULL (all ads should have a status)
ALTER TABLE ads ALTER COLUMN status SET NOT NULL;

-- ============================================================================
-- STEP 8: Recreate indexes with new column name
-- ============================================================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_ads_publishing_status;
DROP INDEX IF EXISTS idx_ads_campaign_status;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_campaign_status ON ads(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_ads_meta_status ON ads(meta_ad_id, status) WHERE meta_ad_id IS NOT NULL;

-- ============================================================================
-- STEP 9: Add documentation comments
-- ============================================================================

COMMENT ON COLUMN ads.status IS 'Current publishing status using ad_status_enum: draft, pending_review, active, learning, paused, rejected, failed, archived';

-- ============================================================================
-- STEP 10: Verification Queries
-- ============================================================================

-- Verify column type
DO $$
DECLARE
  col_type TEXT;
  col_udt TEXT;
BEGIN
  SELECT data_type, udt_name INTO col_type, col_udt
  FROM information_schema.columns 
  WHERE table_schema = 'public'
    AND table_name = 'ads' 
    AND column_name = 'status';
  
  IF col_type = 'USER-DEFINED' AND col_udt = 'ad_status_enum' THEN
    RAISE NOTICE '✅ Column status is properly typed as ad_status_enum';
  ELSE
    RAISE WARNING '❌ Column status has unexpected type: % (udt: %)', col_type, col_udt;
  END IF;
END $$;

-- Check status distribution after migration
DO $$
DECLARE
  status_summary TEXT;
BEGIN
  SELECT string_agg(status::text || ': ' || count, ', ') INTO status_summary
  FROM (
    SELECT status, COUNT(*) as count
    FROM ads
    GROUP BY status
    ORDER BY count DESC
  ) s;
  
  RAISE NOTICE 'Status distribution: %', status_summary;
END $$;

-- Verify no NULL statuses
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM ads WHERE status IS NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING '❌ Found % ads with NULL status', null_count;
  ELSE
    RAISE NOTICE '✅ No NULL statuses found';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

RAISE NOTICE '========================================';
RAISE NOTICE '✅ Ad status schema migration complete!';
RAISE NOTICE 'Column: ads.status (ad_status_enum)';
RAISE NOTICE 'Supported values: draft, pending_review, active, learning, paused, rejected, failed, archived';
RAISE NOTICE '========================================';

