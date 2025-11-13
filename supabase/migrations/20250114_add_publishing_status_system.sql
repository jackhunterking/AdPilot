-- Migration: Add Publishing Status System
-- Purpose: Add enhanced status tracking, error handling, and Meta integration for ad publishing
-- References: https://supabase.com/docs/guides/database/tables

-- ============================================================================
-- 1. Update ads table with new status columns
-- ============================================================================

-- Add new status enum type
DO $$ BEGIN
  CREATE TYPE ad_status_enum AS ENUM (
    'draft',
    'pending_review',
    'active',
    'paused',
    'rejected',
    'failed',
    'learning',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to ads table if they don't exist
ALTER TABLE ads 
  ADD COLUMN IF NOT EXISTS publishing_status ad_status_enum DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS meta_ad_id TEXT,
  ADD COLUMN IF NOT EXISTS last_error JSONB,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Create index on publishing_status for filtering
CREATE INDEX IF NOT EXISTS idx_ads_publishing_status ON ads(publishing_status);
CREATE INDEX IF NOT EXISTS idx_ads_meta_ad_id ON ads(meta_ad_id);
CREATE INDEX IF NOT EXISTS idx_ads_campaign_status ON ads(campaign_id, publishing_status);

-- ============================================================================
-- 2. Create ad_publishing_metadata table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_publishing_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  meta_ad_id TEXT,
  
  -- Publishing timeline
  submission_timestamp TIMESTAMPTZ,
  last_status_check TIMESTAMPTZ,
  status_history JSONB DEFAULT '[]'::jsonb,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  error_user_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Meta review feedback
  meta_review_feedback JSONB,
  rejection_reasons TEXT[],
  
  -- Status metadata
  current_status ad_status_enum DEFAULT 'draft',
  previous_status ad_status_enum,
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one metadata record per ad
  UNIQUE(ad_id)
);

-- Create indexes for ad_publishing_metadata
CREATE INDEX IF NOT EXISTS idx_ad_publishing_metadata_ad_id ON ad_publishing_metadata(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_publishing_metadata_meta_ad_id ON ad_publishing_metadata(meta_ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_publishing_metadata_status ON ad_publishing_metadata(current_status);
CREATE INDEX IF NOT EXISTS idx_ad_publishing_metadata_error ON ad_publishing_metadata(error_code) WHERE error_code IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ad_publishing_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_ad_publishing_metadata_updated_at ON ad_publishing_metadata;
CREATE TRIGGER trigger_update_ad_publishing_metadata_updated_at
  BEFORE UPDATE ON ad_publishing_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_publishing_metadata_updated_at();

-- ============================================================================
-- 3. Create webhook events log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meta_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_id TEXT,
  event_type TEXT NOT NULL,
  
  -- Related entities
  meta_ad_id TEXT,
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Event data
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  
  -- Error handling
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate processing
  UNIQUE(event_id)
);

-- Create indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_meta_ad_id ON meta_webhook_events(meta_ad_id);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_ad_id ON meta_webhook_events(ad_id);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_processed ON meta_webhook_events(processed, received_at);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_event_type ON meta_webhook_events(event_type);

-- ============================================================================
-- 4. Create status transition log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  
  -- Transition details
  from_status ad_status_enum,
  to_status ad_status_enum NOT NULL,
  
  -- Source of transition
  triggered_by TEXT, -- 'user', 'meta_webhook', 'system', 'api'
  trigger_details JSONB,
  
  -- Additional context
  notes TEXT,
  metadata JSONB,
  
  -- Timestamps
  transitioned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for status transitions
CREATE INDEX IF NOT EXISTS idx_ad_status_transitions_ad_id ON ad_status_transitions(ad_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_status_transitions_status ON ad_status_transitions(to_status, transitioned_at DESC);

-- ============================================================================
-- 5. Add RLS (Row Level Security) policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE ad_publishing_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_status_transitions ENABLE ROW LEVEL SECURITY;

-- Policy for ad_publishing_metadata: Users can only see metadata for their own ads
CREATE POLICY "Users can view their own ad publishing metadata"
  ON ad_publishing_metadata
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_publishing_metadata.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own ad publishing metadata"
  ON ad_publishing_metadata
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_publishing_metadata.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own ad publishing metadata"
  ON ad_publishing_metadata
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_publishing_metadata.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Policy for webhook events: Only viewable by system/admins (can be expanded later)
CREATE POLICY "System can manage webhook events"
  ON meta_webhook_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for status transitions: Users can view their own ad transitions
CREATE POLICY "Users can view their own ad status transitions"
  ON ad_status_transitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ads
      JOIN campaigns ON ads.campaign_id = campaigns.id
      WHERE ads.id = ad_status_transitions.ad_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. Create helper functions
-- ============================================================================

-- Function to record status transition
CREATE OR REPLACE FUNCTION record_ad_status_transition(
  p_ad_id UUID,
  p_from_status TEXT,
  p_to_status TEXT,
  p_triggered_by TEXT,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transition_id UUID;
BEGIN
  INSERT INTO ad_status_transitions (
    ad_id,
    from_status,
    to_status,
    triggered_by,
    notes,
    metadata
  ) VALUES (
    p_ad_id,
    p_from_status::ad_status_enum,
    p_to_status::ad_status_enum,
    p_triggered_by,
    p_notes,
    p_metadata
  )
  RETURNING id INTO v_transition_id;
  
  RETURN v_transition_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update ad status with automatic transition logging
CREATE OR REPLACE FUNCTION update_ad_status(
  p_ad_id UUID,
  p_new_status TEXT,
  p_triggered_by TEXT DEFAULT 'system',
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_status TEXT;
  v_success BOOLEAN;
BEGIN
  -- Get current status
  SELECT publishing_status INTO v_old_status FROM ads WHERE id = p_ad_id;
  
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Ad not found: %', p_ad_id;
  END IF;
  
  -- Update ads table
  UPDATE ads 
  SET 
    publishing_status = p_new_status::ad_status_enum,
    updated_at = NOW(),
    -- Set published_at on first publish
    published_at = CASE 
      WHEN p_new_status IN ('pending_review', 'active') AND published_at IS NULL 
      THEN NOW() 
      ELSE published_at 
    END,
    -- Set approved_at when going active
    approved_at = CASE 
      WHEN p_new_status = 'active' AND approved_at IS NULL 
      THEN NOW() 
      ELSE approved_at 
    END,
    -- Set rejected_at when rejected or failed
    rejected_at = CASE 
      WHEN p_new_status IN ('rejected', 'failed') 
      THEN NOW() 
      ELSE rejected_at 
    END
  WHERE id = p_ad_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  
  -- Record transition
  IF v_success THEN
    PERFORM record_ad_status_transition(
      p_ad_id,
      v_old_status,
      p_new_status,
      p_triggered_by,
      p_notes
    );
    
    -- Update metadata table
    UPDATE ad_publishing_metadata
    SET 
      previous_status = v_old_status::ad_status_enum,
      current_status = p_new_status::ad_status_enum,
      status_changed_at = NOW(),
      status_history = status_history || jsonb_build_object(
        'from', v_old_status,
        'to', p_new_status,
        'timestamp', NOW(),
        'triggered_by', p_triggered_by
      )
    WHERE ad_id = p_ad_id;
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Migrate existing data
-- ============================================================================

-- Migrate existing status values to new enum
UPDATE ads 
SET publishing_status = CASE status
  WHEN 'draft' THEN 'draft'::ad_status_enum
  WHEN 'pending_approval' THEN 'pending_review'::ad_status_enum
  WHEN 'active' THEN 'active'::ad_status_enum
  WHEN 'learning' THEN 'learning'::ad_status_enum
  WHEN 'paused' THEN 'paused'::ad_status_enum
  WHEN 'rejected' THEN 'rejected'::ad_status_enum
  WHEN 'archived' THEN 'archived'::ad_status_enum
  ELSE 'draft'::ad_status_enum
END
WHERE publishing_status IS NULL;

-- Create initial metadata records for existing ads
INSERT INTO ad_publishing_metadata (ad_id, current_status, created_at, updated_at)
SELECT 
  id, 
  COALESCE(publishing_status, 'draft'::ad_status_enum),
  created_at,
  updated_at
FROM ads
ON CONFLICT (ad_id) DO NOTHING;

-- ============================================================================
-- 8. Comments for documentation
-- ============================================================================

COMMENT ON TABLE ad_publishing_metadata IS 'Tracks detailed publishing metadata for each ad including errors, retries, and Meta feedback';
COMMENT ON TABLE meta_webhook_events IS 'Logs all webhook events received from Meta for ad status changes';
COMMENT ON TABLE ad_status_transitions IS 'Audit log of all status changes for ads with context';
COMMENT ON COLUMN ads.publishing_status IS 'Current publishing status of the ad (replaces legacy status column)';
COMMENT ON COLUMN ads.last_error IS 'JSON object containing the most recent error details if publishing failed';
COMMENT ON FUNCTION update_ad_status IS 'Updates ad status and automatically logs transition';
COMMENT ON FUNCTION record_ad_status_transition IS 'Records a status transition in the audit log';


