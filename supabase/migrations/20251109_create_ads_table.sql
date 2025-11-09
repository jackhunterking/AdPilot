-- Create ads table for campaign ad management
-- Purpose: Store individual ads within campaigns with their creative, copy, and metrics
-- References:
--  - Supabase: https://supabase.com/docs/guides/database/tables

-- Create ads table
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  meta_ad_id TEXT, -- Meta/Facebook ad ID (null for drafts)
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'learning', 'paused', 'draft')),
  
  -- Store creative and copy data as JSONB for flexibility
  creative_data JSONB,
  copy_data JSONB,
  
  -- Cached metrics snapshot to reduce API calls
  metrics_snapshot JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on campaign_id for fast lookups
CREATE INDEX IF NOT EXISTS ads_campaign_id_idx ON public.ads(campaign_id);

-- Add index on meta_ad_id for syncing with Meta API
CREATE INDEX IF NOT EXISTS ads_meta_ad_id_idx ON public.ads(meta_ad_id) WHERE meta_ad_id IS NOT NULL;

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS ads_status_idx ON public.ads(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ads_updated_at_trigger
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION update_ads_updated_at();

-- Enable Row Level Security
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ads table (following campaigns table pattern)
-- Users can read ads for campaigns they can read
CREATE POLICY "Users can view ads for their campaigns"
  ON public.ads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = ads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Users can insert ads for campaigns they own
CREATE POLICY "Users can insert ads for their campaigns"
  ON public.ads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = ads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Users can update ads for campaigns they own
CREATE POLICY "Users can update ads for their campaigns"
  ON public.ads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = ads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Users can delete ads for campaigns they own
CREATE POLICY "Users can delete ads for their campaigns"
  ON public.ads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = ads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.ads IS 'Stores individual ads within campaigns with creative, copy, and performance metrics';
COMMENT ON COLUMN public.ads.meta_ad_id IS 'Facebook/Meta Ad ID - null for draft ads not yet published';
COMMENT ON COLUMN public.ads.status IS 'Ad delivery status: draft (not published), active (delivering), learning (optimization phase), paused (stopped)';
COMMENT ON COLUMN public.ads.creative_data IS 'JSONB containing image URLs, video URLs, and creative settings';
COMMENT ON COLUMN public.ads.copy_data IS 'JSONB containing headline, primary text, description, CTA, and copy variations';
COMMENT ON COLUMN public.ads.metrics_snapshot IS 'JSONB containing cached performance metrics (reach, impressions, spend, results, cost_per_result, etc.)';

