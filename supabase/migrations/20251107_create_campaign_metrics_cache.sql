-- Create table for caching Meta campaign metrics
-- Stores performance data fetched from Meta Insights API
BEGIN;

CREATE TABLE IF NOT EXISTS public.campaign_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  range_key TEXT NOT NULL DEFAULT 'custom',
  -- Core metrics (no technical jargon stored, just raw numbers)
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  results BIGINT DEFAULT 0,
  -- Calculated metrics (for AI to interpret)
  ctr DECIMAL(5,2),
  cpc DECIMAL(10,2),
  cpm DECIMAL(10,2),
  cost_per_result DECIMAL(10,2),
  -- Date range for these metrics
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  -- Cache metadata
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure uniqueness per campaign per date range + range key
  UNIQUE(campaign_id, range_key, date_start, date_end)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_cache_campaign_id 
  ON public.campaign_metrics_cache(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_cache_range_key
  ON public.campaign_metrics_cache(range_key);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_cache_date_range 
  ON public.campaign_metrics_cache(date_range);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_cache_cached_at 
  ON public.campaign_metrics_cache(cached_at);

-- Enable RLS
ALTER TABLE public.campaign_metrics_cache ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see metrics for their own campaigns
CREATE POLICY "Users can view their own campaign metrics"
  ON public.campaign_metrics_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_metrics_cache.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- RLS policy: System can insert metrics (via service role)
CREATE POLICY "Service role can insert campaign metrics"
  ON public.campaign_metrics_cache
  FOR INSERT
  WITH CHECK (true);

-- RLS policy: System can update metrics (via service role)
CREATE POLICY "Service role can update campaign metrics"
  ON public.campaign_metrics_cache
  FOR UPDATE
  USING (true);

-- Add comment
COMMENT ON TABLE public.campaign_metrics_cache IS 
  'Caches Meta Insights API data. Manual refresh only (no auto-refresh). Stores raw numbers for AI to interpret in plain language.';

COMMIT;

