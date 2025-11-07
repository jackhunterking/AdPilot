-- Create table for tracking published campaigns in Meta
-- Stores Meta platform IDs after campaign is published
BEGIN;

CREATE TABLE IF NOT EXISTS public.meta_published_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  meta_campaign_id TEXT NOT NULL,
  meta_adset_id TEXT NOT NULL,
  meta_ad_ids TEXT[] NOT NULL DEFAULT '{}',
  publish_status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meta_published_campaigns_campaign_id 
  ON public.meta_published_campaigns(campaign_id);

CREATE INDEX IF NOT EXISTS idx_meta_published_campaigns_status 
  ON public.meta_published_campaigns(publish_status);

-- Enable RLS
ALTER TABLE public.meta_published_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own published campaigns
CREATE POLICY "Users can view their own published campaigns"
  ON public.meta_published_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = meta_published_campaigns.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- RLS policy: Users can insert their own published campaigns
CREATE POLICY "Users can insert their own published campaigns"
  ON public.meta_published_campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = meta_published_campaigns.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- RLS policy: Users can update their own published campaigns
CREATE POLICY "Users can update their own published campaigns"
  ON public.meta_published_campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = meta_published_campaigns.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE public.meta_published_campaigns IS 
  'Stores Meta Marketing API IDs for published campaigns. Links internal campaigns to Meta platform entities (Campaign, AdSet, Ads).';

COMMIT;

