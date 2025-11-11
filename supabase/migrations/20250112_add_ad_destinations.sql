-- Add destination fields to ads table for ad-level destination configuration
-- This separates campaign-level goal (immutable) from ad-level destination (flexible)

-- Add destination_type column to track what kind of destination this ad uses
ALTER TABLE ads 
ADD COLUMN IF NOT EXISTS destination_type TEXT CHECK (destination_type IN ('instant_form', 'website_url', 'phone_number'));

-- Add destination_data column to store destination-specific configuration
-- For instant_form: { form_id: string, form_name: string }
-- For website_url: { url: string, display_link?: string }
-- For phone_number: { number: string, formatted?: string }
ALTER TABLE ads 
ADD COLUMN IF NOT EXISTS destination_data JSONB;

-- Create index for faster destination_type lookups
CREATE INDEX IF NOT EXISTS idx_ads_destination_type ON ads(destination_type);

-- Verify that campaigns table has initial_goal column (should already exist from previous migrations)
-- Verify that campaign_states table has goal_data column (should already exist from previous migrations)

-- Add comment to document the column usage
COMMENT ON COLUMN ads.destination_type IS 'Type of destination for this ad: instant_form, website_url, or phone_number';
COMMENT ON COLUMN ads.destination_data IS 'JSONB data for the destination configuration, structure varies by destination_type';

