-- Create table for storing lead form submissions
-- Captures leads from Meta Lead Gen campaigns
BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  meta_form_id TEXT NOT NULL,
  meta_lead_id TEXT NOT NULL UNIQUE,
  -- Store all form field responses as JSONB
  form_data JSONB NOT NULL DEFAULT '{}',
  -- Tracking fields
  submitted_at TIMESTAMPTZ NOT NULL,
  exported_at TIMESTAMPTZ,
  webhook_sent BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_campaign_id 
  ON public.lead_form_submissions(campaign_id);

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_meta_form_id 
  ON public.lead_form_submissions(meta_form_id);

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_submitted_at 
  ON public.lead_form_submissions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_webhook_sent 
  ON public.lead_form_submissions(webhook_sent) 
  WHERE webhook_sent = FALSE;

-- Enable RLS
ALTER TABLE public.lead_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view their own leads
CREATE POLICY "Users can view their own leads"
  ON public.lead_form_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = lead_form_submissions.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- RLS policy: Service role can insert leads
CREATE POLICY "Service role can insert leads"
  ON public.lead_form_submissions
  FOR INSERT
  WITH CHECK (true);

-- RLS policy: Service role can update leads
CREATE POLICY "Service role can update leads"
  ON public.lead_form_submissions
  FOR UPDATE
  USING (true);

-- Add comment
COMMENT ON TABLE public.lead_form_submissions IS 
  'Stores lead form submissions from Meta Lead Gen campaigns. Supports export to CSV and webhook delivery to CRM.';

COMMIT;

