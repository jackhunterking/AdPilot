-- Extend campaign_states table to store publish configuration
BEGIN;

-- Add column for publish data
ALTER TABLE public.campaign_states 
  ADD COLUMN IF NOT EXISTS publish_data JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.campaign_states.publish_data IS 
  'Stores publish configuration and Meta API request parameters used when creating Campaign/AdSet/Ads';

COMMIT;

