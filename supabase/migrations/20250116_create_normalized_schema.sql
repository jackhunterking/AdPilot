-- Migration: Create Normalized Schema for Backend Refactoring
-- Purpose: Replace JSON blob storage with normalized, queryable tables
-- Date: 2025-01-16
-- References:
--  - Supabase: https://supabase.com/docs/guides/database/tables
--  - Backend Refactoring Plan V2

-- ============================================================================
-- PHASE 1: CREATE NEW NORMALIZED TABLES
-- ============================================================================

-- 1. REFACTOR CAMPAIGNS TABLE
-- Add new columns to existing campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS campaign_budget_cents BIGINT,
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'USD';

-- Update existing CHECK constraints
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_goal_type_check,
  ADD CONSTRAINT campaigns_goal_type_check 
    CHECK (initial_goal IN ('leads', 'calls', 'website_visits'));

-- 2. REFACTOR ADS TABLE
-- Add quick access columns to existing ads table
ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS selected_creative_id UUID,
  ADD COLUMN IF NOT EXISTS selected_copy_id UUID;

-- ============================================================================
-- 3. CREATE AD_CREATIVES TABLE (Combines formats + variations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_creatives (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  
  -- Creative Details
  creative_format TEXT NOT NULL CHECK(creative_format IN ('feed', 'story', 'reel')),
  image_url TEXT NOT NULL,
  
  -- Metadata
  creative_style TEXT,
  variation_label TEXT,
  gradient_class TEXT,
  is_base_image BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(ad_id, creative_format, sort_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_creatives_ad_id ON ad_creatives(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_format ON ad_creatives(ad_id, creative_format);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_style ON ad_creatives(creative_style);

-- Comments
COMMENT ON TABLE ad_creatives IS 'Stores all creative variations for ads across feed, story, and reel formats. Combines creative + variations in one table.';
COMMENT ON COLUMN ad_creatives.creative_format IS 'Format type: feed, story, or reel';
COMMENT ON COLUMN ad_creatives.creative_style IS 'AI-generated style: hero_shot, lifestyle_authentic, editorial_dramatic, etc.';
COMMENT ON COLUMN ad_creatives.is_base_image IS 'True if this is the original uploaded image';

-- ============================================================================
-- 4. CREATE AD_COPY_VARIATIONS TABLE (All variations + selected flag)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_copy_variations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  
  -- Copy Content
  headline TEXT NOT NULL CHECK(length(headline) <= 255),
  primary_text TEXT NOT NULL CHECK(length(primary_text) <= 2000),
  description TEXT CHECK(description IS NULL OR length(description) <= 500),
  cta_text TEXT NOT NULL CHECK(length(cta_text) <= 50),
  cta_type TEXT,
  
  -- Image Overlay Text (optional)
  overlay_headline TEXT,
  overlay_offer TEXT,
  overlay_body TEXT,
  overlay_density TEXT CHECK(overlay_density IS NULL OR overlay_density IN ('none', 'light', 'medium', 'heavy', 'text-only')),
  
  -- Selection & Metadata
  is_selected BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  generation_prompt TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(ad_id, sort_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_copy_ad_id ON ad_copy_variations(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_copy_selected ON ad_copy_variations(ad_id, is_selected);

-- Constraint: Only ONE selected per ad
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_copy_one_selected ON ad_copy_variations(ad_id) 
  WHERE is_selected = true;

-- Comments
COMMENT ON TABLE ad_copy_variations IS 'Stores all ad copy variations with one marked as selected. No separate active copy table needed.';
COMMENT ON COLUMN ad_copy_variations.is_selected IS 'True for the user-selected copy variation. Only one per ad.';
COMMENT ON COLUMN ad_copy_variations.overlay_headline IS 'Text overlay headline displayed on the creative image';

-- ============================================================================
-- 5. CREATE AD_TARGET_LOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_target_locations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  
  -- Location Details
  location_name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK(location_type IN ('city', 'region', 'country', 'radius', 'postal_code')),
  
  -- Coordinates (for radius targeting)
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  radius_km NUMERIC(10,2),
  
  -- Targeting Mode
  inclusion_mode TEXT NOT NULL DEFAULT 'include' CHECK(inclusion_mode IN ('include', 'exclude')),
  
  -- Meta Integration
  meta_location_key TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_locations_ad_id ON ad_target_locations(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_locations_name ON ad_target_locations(location_name);
CREATE INDEX IF NOT EXISTS idx_ad_locations_type ON ad_target_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_ad_locations_coords ON ad_target_locations(latitude, longitude) 
  WHERE latitude IS NOT NULL;

-- Comments
COMMENT ON TABLE ad_target_locations IS 'Geographic targeting for ads. Supports cities, regions, countries, and radius targeting.';
COMMENT ON COLUMN ad_target_locations.inclusion_mode IS 'Whether to include or exclude this location from targeting';
COMMENT ON COLUMN ad_target_locations.meta_location_key IS 'Meta Marketing API location key for publishing';

-- ============================================================================
-- 6. CREATE AD_DESTINATIONS TABLE (Polymorphic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_destinations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL UNIQUE REFERENCES ads(id) ON DELETE CASCADE,
  destination_type TEXT NOT NULL CHECK(destination_type IN ('instant_form', 'website_url', 'phone_number')),
  
  -- Instant Form Fields
  instant_form_id UUID,
  
  -- Website URL Fields
  website_url TEXT,
  display_link TEXT,
  utm_params JSONB,
  
  -- Phone Number Fields
  phone_number TEXT,
  phone_country_code TEXT,
  phone_formatted TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validation Constraints
  CHECK (
    (destination_type = 'instant_form' AND instant_form_id IS NOT NULL) OR
    (destination_type = 'website_url' AND website_url IS NOT NULL) OR
    (destination_type = 'phone_number' AND phone_number IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_destinations_ad_id ON ad_destinations(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_destinations_type ON ad_destinations(destination_type);
CREATE INDEX IF NOT EXISTS idx_ad_destinations_form ON ad_destinations(instant_form_id) WHERE instant_form_id IS NOT NULL;

-- Comments
COMMENT ON TABLE ad_destinations IS 'Polymorphic destination config for ads: instant form, website URL, or phone number';
COMMENT ON COLUMN ad_destinations.destination_type IS 'Discriminator field for polymorphic relationship';
COMMENT ON COLUMN ad_destinations.utm_params IS 'UTM tracking parameters as JSONB for website URLs';

-- ============================================================================
-- 7. CREATE AD_BUDGETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_budgets (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL UNIQUE REFERENCES ads(id) ON DELETE CASCADE,
  
  -- Budget Details
  daily_budget_cents BIGINT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  
  -- Schedule
  start_date DATE,
  end_date DATE,
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validation
  CHECK (daily_budget_cents > 0),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_budgets_ad_id ON ad_budgets(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_budgets_amount ON ad_budgets(daily_budget_cents);
CREATE INDEX IF NOT EXISTS idx_ad_budgets_dates ON ad_budgets(start_date, end_date);

-- Comments
COMMENT ON TABLE ad_budgets IS 'Per-ad budget allocation. Campaign budget is distributed to ads by AI.';
COMMENT ON COLUMN ad_budgets.daily_budget_cents IS 'Daily budget in cents (e.g., 50000 = $500.00) to avoid floating point errors';

-- ============================================================================
-- 8. CREATE INSTANT_FORMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS instant_forms (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meta_form_id TEXT,
  name TEXT NOT NULL,
  
  -- Intro Page
  intro_headline TEXT NOT NULL,
  intro_description TEXT,
  intro_image_url TEXT,
  
  -- Privacy
  privacy_policy_url TEXT NOT NULL,
  privacy_link_text TEXT DEFAULT 'Privacy Policy',
  
  -- Thank You Page
  thank_you_title TEXT NOT NULL,
  thank_you_message TEXT NOT NULL,
  thank_you_button_text TEXT,
  thank_you_button_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_instant_forms_user_id ON instant_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_instant_forms_campaign_id ON instant_forms(campaign_id);

-- Comments
COMMENT ON TABLE instant_forms IS 'Reusable lead form definitions for instant form ads';
COMMENT ON COLUMN instant_forms.meta_form_id IS 'Meta Lead Gen form ID after publishing to Meta';

-- ============================================================================
-- 9. CREATE INSTANT_FORM_FIELDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS instant_form_fields (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES instant_forms(id) ON DELETE CASCADE,
  
  -- Field Configuration
  field_type TEXT NOT NULL CHECK(field_type IN ('full_name', 'email', 'phone', 'custom_text')),
  field_label TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  sort_order INT NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(form_id, sort_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON instant_form_fields(form_id);

-- Comments
COMMENT ON TABLE instant_form_fields IS 'Field definitions for instant forms';
COMMENT ON COLUMN instant_form_fields.sort_order IS 'Display order of fields in the form';

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_copy_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_target_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_form_fields ENABLE ROW LEVEL SECURITY;

-- Policies: Users can manage their own ads' data
CREATE POLICY "Users can view their own ad creatives"
  ON ad_creatives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_creatives.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own ad creatives"
  ON ad_creatives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_creatives.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own ad creatives"
  ON ad_creatives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_creatives.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own ad creatives"
  ON ad_creatives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_creatives.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Copy variations policies
CREATE POLICY "Users can view their own ad copy"
  ON ad_copy_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_copy_variations.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own ad copy"
  ON ad_copy_variations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_copy_variations.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Location policies
CREATE POLICY "Users can manage their own ad locations"
  ON ad_target_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_target_locations.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Destination policies
CREATE POLICY "Users can manage their own ad destinations"
  ON ad_destinations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_destinations.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Budget policies
CREATE POLICY "Users can manage their own ad budgets"
  ON ad_budgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_budgets.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Instant forms policies
CREATE POLICY "Users can view their own forms"
  ON instant_forms FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own forms"
  ON instant_forms FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own forms"
  ON instant_forms FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own forms"
  ON instant_forms FOR DELETE
  USING (user_id = auth.uid());

-- Form fields policies
CREATE POLICY "Users can manage their own form fields"
  ON instant_form_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM instant_forms
      WHERE instant_forms.id = instant_form_fields.form_id
      AND instant_forms.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for ad_destinations
CREATE OR REPLACE FUNCTION update_ad_destinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_destinations_updated_at
  BEFORE UPDATE ON ad_destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_destinations_updated_at();

-- Updated_at trigger for ad_budgets
CREATE OR REPLACE FUNCTION update_ad_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_budgets_updated_at
  BEFORE UPDATE ON ad_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_budgets_updated_at();

-- Updated_at trigger for instant_forms
CREATE OR REPLACE FUNCTION update_instant_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_instant_forms_updated_at
  BEFORE UPDATE ON instant_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_instant_forms_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Normalized schema created successfully';
  RAISE NOTICE 'New tables:';
  RAISE NOTICE '  - ad_creatives (creative formats + variations)';
  RAISE NOTICE '  - ad_copy_variations (all copy variations)';
  RAISE NOTICE '  - ad_target_locations (location targeting)';
  RAISE NOTICE '  - ad_destinations (polymorphic destinations)';
  RAISE NOTICE '  - ad_budgets (per-ad budget allocation)';
  RAISE NOTICE '  - instant_forms (reusable lead forms)';
  RAISE NOTICE '  - instant_form_fields (form field definitions)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run data migration to extract JSON into tables';
END $$;

