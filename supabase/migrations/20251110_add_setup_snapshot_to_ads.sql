-- Add setup_snapshot column to ads table
-- Purpose: Store complete wizard state as single source of truth for ad preview
-- References:
--  - Supabase: https://supabase.com/docs/guides/database/tables

-- Add setup_snapshot JSONB column to store complete wizard state
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS setup_snapshot JSONB;

-- Add index for querying by snapshot fields (optional but helpful for future queries)
CREATE INDEX IF NOT EXISTS ads_setup_snapshot_idx ON public.ads USING gin(setup_snapshot);

-- Add comment for documentation
COMMENT ON COLUMN public.ads.setup_snapshot IS 'Complete wizard state snapshot including creative, copy, targeting, goal, and budget settings';

