-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal TEXT NOT NULL CHECK (goal IN ('leads', 'website_visits', 'calls')),
  budget DECIMAL(10, 2) NOT NULL,
  daily_budget DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'draft')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  facebook_campaign_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ad_variants table (stores original ad + A/B test variants)
CREATE TABLE IF NOT EXISTS ad_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL, -- e.g., "Original", "Variant A", "Variant B"
  variant_type TEXT NOT NULL DEFAULT 'original' CHECK (variant_type IN ('original', 'test')),
  parent_variant_id UUID REFERENCES ad_variants(id), -- Links to original variant for A/B tests
  
  -- A/B test parameters
  test_variable TEXT CHECK (test_variable IN ('location', 'audience', 'ad_copy', 'creative')),
  
  -- Ad details
  target_location JSONB, -- Geographic targeting
  audience JSONB, -- Demographics, interests, behaviors
  ad_copy JSONB, -- headline, description, cta
  creative_url TEXT, -- Image/video URL
  creative_type TEXT CHECK (creative_type IN ('image', 'video', 'carousel')),
  
  -- Position on canvas
  position_x DECIMAL(10, 2) DEFAULT 0,
  position_y DECIMAL(10, 2) DEFAULT 0,
  
  facebook_ad_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create metrics table (stores real-time performance data)
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_variant_id UUID NOT NULL REFERENCES ad_variants(id) ON DELETE CASCADE,
  
  -- Core metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5, 2) DEFAULT 0, -- Click-through rate
  cpm DECIMAL(10, 2) DEFAULT 0, -- Cost per thousand impressions
  amount_spent DECIMAL(10, 2) DEFAULT 0,
  cost_per_result DECIMAL(10, 2) DEFAULT 0,
  
  -- Goal-specific metrics
  leads INTEGER DEFAULT 0, -- For lead campaigns
  website_visits INTEGER DEFAULT 0, -- For website visit campaigns
  calls INTEGER DEFAULT 0, -- For call campaigns
  
  -- Additional metrics
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lead_forms table (configuration for lead campaigns)
CREATE TABLE IF NOT EXISTS lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  fields JSONB NOT NULL, -- Array of form fields: [{name, type, required, placeholder}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lead_submissions table (actual lead data)
CREATE TABLE IF NOT EXISTS lead_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_variant_id UUID NOT NULL REFERENCES ad_variants(id) ON DELETE CASCADE,
  lead_form_id UUID NOT NULL REFERENCES lead_forms(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL, -- Actual form data submitted
  facebook_lead_id TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_variants_campaign_id ON ad_variants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_variants_parent_variant_id ON ad_variants(parent_variant_id);
CREATE INDEX IF NOT EXISTS idx_metrics_ad_variant_id ON metrics(ad_variant_id);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_ad_variant_id ON lead_submissions(ad_variant_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_variants_updated_at BEFORE UPDATE ON ad_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_forms_updated_at BEFORE UPDATE ON lead_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
