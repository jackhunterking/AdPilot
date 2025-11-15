-- Migration: Remove campaign-level location data and ensure all location data is ad-level
-- Purpose: Consolidate location targeting to ad-level only (ads.setup_snapshot.location)
-- Date: 2025-11-15

-- Step 1: Migrate any remaining campaign-level location data to ads
-- This ensures we don't lose any existing location targeting data
WITH campaign_locations AS (
  SELECT 
    c.id as campaign_id,
    c.campaign_states->'location_data' as location_data
  FROM campaigns c
  WHERE c.campaign_states->'location_data' IS NOT NULL
    AND jsonb_array_length(
      COALESCE(c.campaign_states->'location_data'->'locations', '[]'::jsonb)
    ) > 0
)
UPDATE ads
SET setup_snapshot = jsonb_set(
  COALESCE(setup_snapshot, '{}'::jsonb),
  '{location}',
  cl.location_data
)
FROM campaign_locations cl
WHERE ads.campaign_id = cl.campaign_id
  AND (
    ads.setup_snapshot->'location' IS NULL 
    OR jsonb_array_length(
      COALESCE(ads.setup_snapshot->'location'->'locations', '[]'::jsonb)
    ) = 0
  );

-- Step 2: Remove location_data from campaign_states (keep other campaign data)
UPDATE campaigns
SET campaign_states = campaign_states - 'location_data'
WHERE campaign_states ? 'location_data';

-- Step 3: Verify migration success
DO $$
DECLARE
  campaigns_with_location integer;
  ads_with_location integer;
BEGIN
  SELECT COUNT(*) INTO campaigns_with_location
  FROM campaigns
  WHERE campaign_states ? 'location_data';
  
  SELECT COUNT(*) INTO ads_with_location
  FROM ads
  WHERE setup_snapshot->'location' IS NOT NULL
    AND jsonb_array_length(
      COALESCE(setup_snapshot->'location'->'locations', '[]'::jsonb)
    ) > 0;
  
  RAISE NOTICE 'Migration Complete:';
  RAISE NOTICE '  - Campaigns with location_data remaining: %', campaigns_with_location;
  RAISE NOTICE '  - Ads with location targeting: %', ads_with_location;
  
  IF campaigns_with_location > 0 THEN
    RAISE WARNING 'Some campaigns still have location_data - please investigate';
  END IF;
END $$;

