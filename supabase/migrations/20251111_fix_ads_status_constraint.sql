-- Fix ads table status constraint to align with TypeScript types
-- Purpose: Add 'archived' status and ensure consistency between DB and code
-- References:
--  - Supabase: https://supabase.com/docs/guides/database/tables

-- Drop the old constraint
ALTER TABLE public.ads 
DROP CONSTRAINT IF EXISTS ads_status_check;

-- Add the new constraint with 'archived' included
ALTER TABLE public.ads 
ADD CONSTRAINT ads_status_check 
CHECK (status IN ('active', 'learning', 'paused', 'draft', 'archived'));

-- Update comment
COMMENT ON COLUMN public.ads.status IS 'Ad delivery status: draft (not published), active (delivering), learning (optimization phase), paused (stopped), archived (historical)';

