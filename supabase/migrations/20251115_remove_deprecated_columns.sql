-- Migration: Remove deprecated columns from campaign_states
-- Purpose: Clean up legacy columns that are no longer used
-- Date: 2025-11-15

-- Remove location_data column (deprecated - now in ads.setup_snapshot.location)
ALTER TABLE campaign_states DROP COLUMN IF EXISTS location_data;

-- Remove generated_images column (legacy - now in ad_preview_data)
ALTER TABLE campaign_states DROP COLUMN IF EXISTS generated_images;

-- Verification
DO $$
DECLARE
  remaining_columns text[];
BEGIN
  SELECT array_agg(column_name)
  INTO remaining_columns
  FROM information_schema.columns
  WHERE table_name = 'campaign_states'
    AND table_schema = 'public';
  
  RAISE NOTICE 'Deprecated Columns Removed';
  RAISE NOTICE '  - location_data (moved to ads.setup_snapshot.location)';
  RAISE NOTICE '  - generated_images (moved to ad_preview_data)';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining campaign_states columns: %', remaining_columns;
END $$;

