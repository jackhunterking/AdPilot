-- Add completed_steps column to ads table
-- This column tracks which wizard steps have been completed for each ad
-- Example: ["ads", "copy", "destination", "location"]

ALTER TABLE ads 
ADD COLUMN IF NOT EXISTS completed_steps JSONB DEFAULT '[]'::jsonb;

-- Add index for querying by completed steps
CREATE INDEX IF NOT EXISTS idx_ads_completed_steps ON ads USING GIN (completed_steps);

-- Add comment
COMMENT ON COLUMN ads.completed_steps IS 'Array of completed wizard step IDs (e.g., ["ads", "copy", "destination", "location"])';

-- Verification query (can be run separately to verify migration)
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'ads' AND column_name = 'completed_steps';
-- Should return: completed_steps | jsonb | '[]'::jsonb

