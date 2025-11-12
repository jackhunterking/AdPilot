-- Migration: Add setup_snapshot column to ads table
-- Purpose: Store complete wizard snapshot for ad hydration in edit mode
-- References:
--  - Supabase JSON: https://supabase.com/docs/guides/database/json

-- Add setup_snapshot jsonb column to ads table
ALTER TABLE ads
ADD COLUMN IF NOT EXISTS setup_snapshot jsonb;

-- Add comment for documentation
COMMENT ON COLUMN ads.setup_snapshot IS 'Complete wizard snapshot including creative, copy, location, destination, goal, and budget data';

-- Optional: Add GIN index for faster JSON queries (useful for future analytics)
CREATE INDEX IF NOT EXISTS idx_ads_setup_snapshot ON ads USING GIN (setup_snapshot);

