-- Add status tracking columns to ads table
-- Purpose: Track ad publishing lifecycle with detailed timestamps and Meta review status
-- References:
--  - Supabase: https://supabase.com/docs/guides/database/migrations
--  - Meta Ad Review: https://www.facebook.com/business/help/247189082393271

BEGIN;

-- Add new columns for tracking ad lifecycle
ALTER TABLE public.ads 
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_review_status TEXT NOT NULL DEFAULT 'not_submitted' 
    CHECK (meta_review_status IN ('not_submitted', 'pending', 'approved', 'rejected', 'changes_requested'));

-- Drop the old status constraint
ALTER TABLE public.ads 
  DROP CONSTRAINT IF EXISTS ads_status_check;

-- Add updated status constraint with new values
ALTER TABLE public.ads 
  ADD CONSTRAINT ads_status_check 
  CHECK (status IN ('draft', 'pending_approval', 'active', 'learning', 'paused', 'rejected', 'archived'));

-- Add index on meta_review_status for filtering
CREATE INDEX IF NOT EXISTS ads_meta_review_status_idx ON public.ads(meta_review_status);

-- Add index on published_at for sorting
CREATE INDEX IF NOT EXISTS ads_published_at_idx ON public.ads(published_at) WHERE published_at IS NOT NULL;

-- Update column comments
COMMENT ON COLUMN public.ads.status IS 'Ad delivery status: draft (not published), pending_approval (submitted for review), active (approved and delivering), learning (optimization phase), paused (stopped), rejected (needs changes), archived (historical)';
COMMENT ON COLUMN public.ads.published_at IS 'Timestamp when user clicked publish and submitted ad for review';
COMMENT ON COLUMN public.ads.approved_at IS 'Timestamp when ad was approved by Meta (or manually for testing)';
COMMENT ON COLUMN public.ads.rejected_at IS 'Timestamp when ad was rejected by Meta';
COMMENT ON COLUMN public.ads.meta_review_status IS 'Meta review status: not_submitted (draft), pending (under review), approved (live), rejected (needs changes), changes_requested (specific changes needed)';

COMMIT;

