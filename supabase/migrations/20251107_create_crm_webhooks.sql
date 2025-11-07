-- Create table for CRM webhook configurations
-- Allows campaigns to push lead data to external CRM systems
BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  webhook_url TEXT NOT NULL,
  secret_key TEXT,
  -- Events that trigger the webhook
  events TEXT[] NOT NULL DEFAULT ARRAY['lead_received'],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_crm_webhooks_campaign_id 
  ON public.crm_webhooks(campaign_id);

CREATE INDEX IF NOT EXISTS idx_crm_webhooks_active 
  ON public.crm_webhooks(active) 
  WHERE active = TRUE;

-- Enable RLS
ALTER TABLE public.crm_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view their own webhooks
CREATE POLICY "Users can view their own webhooks"
  ON public.crm_webhooks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = crm_webhooks.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- RLS policy: Users can insert their own webhooks
CREATE POLICY "Users can insert their own webhooks"
  ON public.crm_webhooks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = crm_webhooks.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- RLS policy: Users can update their own webhooks
CREATE POLICY "Users can update their own webhooks"
  ON public.crm_webhooks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = crm_webhooks.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- RLS policy: Users can delete their own webhooks
CREATE POLICY "Users can delete their own webhooks"
  ON public.crm_webhooks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = crm_webhooks.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE public.crm_webhooks IS 
  'CRM webhook configurations for real-time lead delivery. Supports HMAC-SHA256 signing and retry logic.';

COMMIT;

