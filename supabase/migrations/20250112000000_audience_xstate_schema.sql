-- ============================================
-- Migration: Audience XState Schema Update
-- Purpose: Document new XState-based audience_data schema
-- Date: 2025-01-12
-- ============================================

-- Add comment to document the new schema format for audience_data
COMMENT ON COLUMN campaign_states.audience_data IS 
'Audience targeting data. As of v2 (XState implementation), uses structure:
{
  "version": 1,
  "machineState": "aiCompleted" | "manualCompleted" | etc,
  "context": {
    "mode": "ai" | "manual",
    "advantage_plus_enabled": boolean,
    "demographics": {...},
    "detailedTargeting": {...},
    "metadata": {
      "lastModified": "ISO8601",
      "transitionCount": number,
      "campaignId": "uuid"
    }
  }
}

Legacy format (v1) still supported during migration:
{
  "status": "completed" | "idle" | etc,
  "targeting": {
    "mode": "ai" | "manual",
    "demographics": {...},
    "detailedTargeting": {...}
  },
  "isSelected": boolean
}';

-- Create an index on audience_data for faster queries
-- This helps with queries that filter by mode or state
CREATE INDEX IF NOT EXISTS idx_campaign_states_audience_mode 
ON campaign_states ((audience_data->>'version'));

-- Create a function to validate audience_data schema
CREATE OR REPLACE FUNCTION validate_audience_data_schema()
RETURNS TRIGGER AS $$
BEGIN
  -- If audience_data is not null, ensure it has either version key (new) or status key (legacy)
  IF NEW.audience_data IS NOT NULL THEN
    IF NOT (
      NEW.audience_data ? 'version' OR 
      NEW.audience_data ? 'status'
    ) THEN
      RAISE EXCEPTION 'Invalid audience_data schema: must have either "version" (new) or "status" (legacy) key';
    END IF;
    
    -- If version exists, validate it's a number
    IF NEW.audience_data ? 'version' THEN
      IF NOT (NEW.audience_data->>'version' ~ '^\d+$') THEN
        RAISE EXCEPTION 'Invalid audience_data schema: "version" must be a number';
      END IF;
      
      -- Validate new schema has required keys
      IF NOT (
        NEW.audience_data ? 'machineState' AND
        NEW.audience_data ? 'context'
      ) THEN
        RAISE EXCEPTION 'Invalid audience_data schema v2: must have "machineState" and "context" keys';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate schema on insert/update
DROP TRIGGER IF EXISTS validate_audience_data_trigger ON campaign_states;
CREATE TRIGGER validate_audience_data_trigger
  BEFORE INSERT OR UPDATE OF audience_data
  ON campaign_states
  FOR EACH ROW
  EXECUTE FUNCTION validate_audience_data_schema();

-- Add helpful comment to the function
COMMENT ON FUNCTION validate_audience_data_schema() IS 
'Validates audience_data JSONB structure to ensure it matches either:
- New v2 schema (XState): { version, machineState, context }
- Legacy v1 schema: { status, targeting, isSelected }';

-- ============================================
-- Test Data Queries (commented out for production)
-- ============================================

-- Example: Query all campaigns using new XState schema
-- SELECT campaign_id, audience_data->>'machineState' as state
-- FROM campaign_states
-- WHERE audience_data->>'version' = '1';

-- Example: Query all campaigns still using legacy schema  
-- SELECT campaign_id, audience_data->>'status' as status
-- FROM campaign_states
-- WHERE audience_data ? 'status' AND NOT audience_data ? 'version';

-- ============================================
-- Rollback Instructions
-- ============================================
-- To rollback this migration:
-- DROP TRIGGER IF EXISTS validate_audience_data_trigger ON campaign_states;
-- DROP FUNCTION IF EXISTS validate_audience_data_schema();
-- DROP INDEX IF EXISTS idx_campaign_states_audience_mode;
-- COMMENT ON COLUMN campaign_states.audience_data IS NULL;

