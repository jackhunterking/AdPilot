-- Migration: Add Foreign Keys for selected_creative_id and selected_copy_id
-- Purpose: Enable PostgREST to use FK hints for nested queries
-- Date: 2025-11-16
-- Issue: PGRST200 error - "Searched for a foreign key relationship but couldn't find one"

-- Add foreign key constraint for selected_creative_id
-- This allows queries like: ads(*, ad_creatives!selected_creative_id(*))
ALTER TABLE ads 
ADD CONSTRAINT IF NOT EXISTS ads_selected_creative_id_fkey 
FOREIGN KEY (selected_creative_id) 
REFERENCES ad_creatives(id) 
ON DELETE SET NULL;

-- Add foreign key constraint for selected_copy_id
-- This allows queries like: ads(*, ad_copy_variations!selected_copy_id(*))
ALTER TABLE ads 
ADD CONSTRAINT IF NOT EXISTS ads_selected_copy_id_fkey 
FOREIGN KEY (selected_copy_id) 
REFERENCES ad_copy_variations(id) 
ON DELETE SET NULL;

-- Verify the constraints were created
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraints added successfully:';
  RAISE NOTICE '  - ads.selected_creative_id -> ad_creatives.id';
  RAISE NOTICE '  - ads.selected_copy_id -> ad_copy_variations.id';
  RAISE NOTICE '';
  RAISE NOTICE 'PostgREST can now resolve these FK hints in nested queries';
END $$;

