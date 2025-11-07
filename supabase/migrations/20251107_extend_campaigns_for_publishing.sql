-- Extend campaigns table to track publishing status
BEGIN;

-- Add columns for publishing status tracking
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS published_status TEXT DEFAULT 'unpublished',
  ADD COLUMN IF NOT EXISTS last_metrics_sync_at TIMESTAMPTZ;

-- Add index for published status
CREATE INDEX IF NOT EXISTS idx_campaigns_published_status 
  ON public.campaigns(published_status);

-- Add comment
COMMENT ON COLUMN public.campaigns.published_status IS 
  'Publishing status: unpublished, publishing, active, paused, completed, error';

COMMENT ON COLUMN public.campaigns.last_metrics_sync_at IS 
  'Last time metrics were manually refreshed from Meta Insights API';

COMMIT;

