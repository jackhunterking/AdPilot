-- Lovable Integration Migration
-- Purpose: Add tables for Lovable Chrome extension integration
-- References:
--   - Lovable service contracts: lib/services/lovable/contracts/
--   - AdPilot is source of truth for all data
--   - Lovable provides only AI generation (tokens)

-- ============================================================================
-- 1. Lovable Project Links
-- ============================================================================
-- Links Lovable projects to AdPilot users
-- One user can link multiple Lovable projects
-- All campaign data stored in AdPilot (source of truth)

CREATE TABLE IF NOT EXISTS lovable_project_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lovable_project_id text NOT NULL,
  supabase_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- One user can link each Lovable project only once
  UNIQUE(user_id, lovable_project_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_lovable_links_user 
  ON lovable_project_links(user_id);

CREATE INDEX IF NOT EXISTS idx_lovable_links_project 
  ON lovable_project_links(lovable_project_id);

CREATE INDEX IF NOT EXISTS idx_lovable_links_status 
  ON lovable_project_links(user_id, status);

-- Add updated_at trigger
CREATE TRIGGER update_lovable_project_links_updated_at
  BEFORE UPDATE ON lovable_project_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE lovable_project_links IS 
  'Links Lovable projects to AdPilot users. AdPilot stores all campaign data (source of truth).';

COMMENT ON COLUMN lovable_project_links.lovable_project_id IS 
  'Lovable project ID extracted from lovable.dev URL';

COMMENT ON COLUMN lovable_project_links.supabase_url IS 
  'User''s Lovable project Supabase URL (for temporary image staging)';

COMMENT ON COLUMN lovable_project_links.metadata IS 
  'Project metadata: name, URL, sync stats, etc.';

-- ============================================================================
-- 2. Campaign Conversions
-- ============================================================================
-- Tracks conversions (signups, purchases, etc.) from Lovable projects
-- Received via webhook from user's Lovable Edge Functions

CREATE TABLE IF NOT EXISTS campaign_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversion_type text NOT NULL CHECK (conversion_type IN ('signup', 'purchase', 'call', 'form_submit', 'custom')),
  conversion_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'lovable_webhook' CHECK (source IN ('lovable_webhook', 'lovable_edge_function', 'meta_pixel', 'custom_webhook')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_conversions_campaign_time 
  ON campaign_conversions(campaign_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_conversions_user 
  ON campaign_conversions(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_conversions_type 
  ON campaign_conversions(campaign_id, conversion_type);

CREATE INDEX IF NOT EXISTS idx_conversions_source 
  ON campaign_conversions(campaign_id, source);

-- GIN index for searching within conversion_data JSONB
CREATE INDEX IF NOT EXISTS idx_conversions_data 
  ON campaign_conversions USING GIN (conversion_data);

-- Comments
COMMENT ON TABLE campaign_conversions IS 
  'Conversion events from Lovable projects (signups, purchases, etc.)';

COMMENT ON COLUMN campaign_conversions.conversion_data IS 
  'Flexible JSONB: email, name, phone, custom fields';

COMMENT ON COLUMN campaign_conversions.source IS 
  'Where conversion came from: webhook, Edge Function, Meta Pixel, etc.';

-- ============================================================================
-- 3. Lovable Subscriptions
-- ============================================================================
-- Manages $9/month subscriptions for Lovable integration
-- Separate from main AdPilot plans

CREATE TABLE IF NOT EXISTS lovable_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  plan_id text NOT NULL DEFAULT 'lovable_9_monthly',
  trial_ends_at timestamptz,
  next_billing_date timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- One subscription per user
  UNIQUE(user_id)
);

-- Indexes for subscription management
CREATE INDEX IF NOT EXISTS idx_lovable_subscriptions_user 
  ON lovable_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_lovable_subscriptions_stripe 
  ON lovable_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lovable_subscriptions_status 
  ON lovable_subscriptions(status);

-- Add updated_at trigger
CREATE TRIGGER update_lovable_subscriptions_updated_at
  BEFORE UPDATE ON lovable_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE lovable_subscriptions IS 
  '$9/month subscription for Lovable integration (separate from main AdPilot plans)';

COMMENT ON COLUMN lovable_subscriptions.trial_ends_at IS 
  '7-day free trial end date';

-- ============================================================================
-- 4. Image Import Records (Audit Trail)
-- ============================================================================
-- Tracks images imported from Lovable Storage → AdPilot Storage
-- Maintains link between original and copied images

CREATE TABLE IF NOT EXISTS lovable_image_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creative_id uuid REFERENCES ad_creatives(id) ON DELETE SET NULL,
  lovable_image_url text NOT NULL,
  adpilot_image_url text NOT NULL,
  import_status text NOT NULL DEFAULT 'completed' CHECK (import_status IN ('pending', 'downloading', 'uploading', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for tracking imports
CREATE INDEX IF NOT EXISTS idx_image_imports_user 
  ON lovable_image_imports(user_id);

CREATE INDEX IF NOT EXISTS idx_image_imports_campaign 
  ON lovable_image_imports(campaign_id);

CREATE INDEX IF NOT EXISTS idx_image_imports_creative 
  ON lovable_image_imports(creative_id) WHERE creative_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_image_imports_lovable_url 
  ON lovable_image_imports(lovable_image_url);

-- Comments
COMMENT ON TABLE lovable_image_imports IS 
  'Audit trail of images imported from Lovable Storage to AdPilot Storage';

COMMENT ON COLUMN lovable_image_imports.lovable_image_url IS 
  'Original URL in user''s Lovable Supabase Storage';

COMMENT ON COLUMN lovable_image_imports.adpilot_image_url IS 
  'Copied URL in AdPilot Supabase Storage (source of truth)';

COMMENT ON COLUMN lovable_image_imports.metadata IS 
  'Import metadata: bucket, file size, prompt, generated_by, etc.';

-- ============================================================================
-- 5. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE lovable_project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lovable_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lovable_image_imports ENABLE ROW LEVEL SECURITY;

-- Lovable Project Links Policies
CREATE POLICY "Users can view their own Lovable project links"
  ON lovable_project_links FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own Lovable project links"
  ON lovable_project_links FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own Lovable project links"
  ON lovable_project_links FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own Lovable project links"
  ON lovable_project_links FOR DELETE
  USING (user_id = auth.uid());

-- Campaign Conversions Policies
CREATE POLICY "Users can view conversions for their campaigns"
  ON campaign_conversions FOR SELECT
  USING (user_id = auth.uid());

-- Note: INSERT is handled by webhook endpoint with service role key
-- Users cannot directly insert conversions (comes from webhooks)

-- Lovable Subscriptions Policies
CREATE POLICY "Users can view their own Lovable subscription"
  ON lovable_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Note: INSERT/UPDATE handled by Stripe webhooks with service role key

-- Image Imports Policies
CREATE POLICY "Users can view their own image imports"
  ON lovable_image_imports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create image imports"
  ON lovable_image_imports FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Get active Lovable subscription for user
CREATE OR REPLACE FUNCTION get_lovable_subscription_status(p_user_id uuid)
RETURNS TABLE (
  has_active_subscription boolean,
  status text,
  plan_id text,
  trial_ends_at timestamptz,
  next_billing_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN s.status IN ('trialing', 'active') THEN true
      ELSE false
    END as has_active_subscription,
    s.status,
    s.plan_id,
    s.trial_ends_at,
    s.next_billing_date
  FROM lovable_subscriptions s
  WHERE s.user_id = p_user_id;
  
  -- If no subscription found, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'none'::text, null::text, null::timestamptz, null::timestamptz;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get conversion stats for campaign
CREATE OR REPLACE FUNCTION get_campaign_conversion_stats(
  p_campaign_id uuid,
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  total_conversions bigint,
  signups bigint,
  purchases bigint,
  calls bigint,
  custom bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH conversion_counts AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE conversion_type = 'signup') as signup_count,
      COUNT(*) FILTER (WHERE conversion_type = 'purchase') as purchase_count,
      COUNT(*) FILTER (WHERE conversion_type = 'call') as call_count,
      COUNT(*) FILTER (WHERE conversion_type = 'custom') as custom_count
    FROM campaign_conversions
    WHERE campaign_id = p_campaign_id
      AND timestamp BETWEEN p_start_date AND p_end_date
  ),
  metrics AS (
    SELECT COALESCE(clicks, 0) as total_clicks
    FROM campaign_metrics_cache
    WHERE campaign_id = p_campaign_id
    ORDER BY cached_at DESC
    LIMIT 1
  )
  SELECT 
    cc.total,
    cc.signup_count,
    cc.purchase_count,
    cc.call_count,
    cc.custom_count,
    CASE 
      WHEN m.total_clicks > 0 THEN ROUND((cc.total::numeric / m.total_clicks::numeric) * 100, 2)
      ELSE 0
    END as rate
  FROM conversion_counts cc
  CROSS JOIN metrics m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Verification Queries (Run separately to verify migration)
-- ============================================================================

/*
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('lovable_project_links', 'campaign_conversions', 'lovable_subscriptions', 'lovable_image_imports')
ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('lovable_project_links', 'campaign_conversions', 'lovable_subscriptions', 'lovable_image_imports');

-- Verify indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('lovable_project_links', 'campaign_conversions', 'lovable_subscriptions', 'lovable_image_imports')
ORDER BY tablename, indexname;

-- Test helper functions
SELECT get_lovable_subscription_status('00000000-0000-0000-0000-000000000000');
SELECT * FROM get_campaign_conversion_stats('00000000-0000-0000-0000-000000000000');
*/

