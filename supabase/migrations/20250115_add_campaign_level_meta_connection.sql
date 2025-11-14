-- Migration: Add Campaign-Level Meta Connection and AI Conversation
-- Purpose: Move Meta connection from localStorage to database, add campaign-level AI conversation ID
-- References:
--  - Supabase JSONB: https://supabase.com/docs/guides/database/json
--  - Campaign data hierarchy: Campaign-level (shared) vs Ad-level (specific)

-- ============================================================================
-- 1. Add meta_connection_data to campaign_states table
-- ============================================================================

-- Add meta_connection_data column to store Meta connection at campaign level
ALTER TABLE campaign_states
ADD COLUMN IF NOT EXISTS meta_connection_data jsonb;

COMMENT ON COLUMN campaign_states.meta_connection_data IS 'Meta connection shared across all ads in campaign: business, page, ad account, tokens, payment status';

-- Create GIN index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_campaign_states_meta_connection 
ON campaign_states USING GIN (meta_connection_data);

-- ============================================================================
-- 2. Add ai_conversation_id to campaigns table
-- ============================================================================

-- Add ai_conversation_id column for campaign-level AI chat
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS ai_conversation_id text;

COMMENT ON COLUMN campaigns.ai_conversation_id IS 'Campaign-level AI chat conversation ID - persists across all ads in campaign';

-- Create index for faster conversation lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_ai_conversation 
ON campaigns(ai_conversation_id);

-- ============================================================================
-- 3. Schema Documentation
-- ============================================================================

-- Campaign-Level Data (Shared Across All Ads):
--   - campaigns.ai_conversation_id: AI chat conversation (persists when switching ads)
--   - campaign_states.goal_data: Campaign objective (leads/calls/website-visits)
--   - campaign_states.budget_data: Daily budget, currency, schedule
--   - campaign_states.meta_connection_data: Business, Page, Ad Account, tokens
--
-- Ad-Level Data (Specific to Each Ad):
--   - ads.setup_snapshot.creative: Images, variations, selected index
--   - ads.setup_snapshot.copy: Headlines, body text, CTAs
--   - ads.setup_snapshot.location: Targeting locations
--   - ads.setup_snapshot.destination: Form/URL/Phone
--   - ads.status, ads.meta_ad_id: Publishing state

-- ============================================================================
-- 4. Meta Connection Data Structure
-- ============================================================================

-- Expected structure for campaign_states.meta_connection_data:
-- {
--   "business": {
--     "id": "string",
--     "name": "string"
--   },
--   "page": {
--     "id": "string", 
--     "name": "string",
--     "access_token": "string"
--   },
--   "adAccount": {
--     "id": "string",
--     "name": "string",
--     "currency": "string"
--   },
--   "instagram": {
--     "id": "string",
--     "username": "string"
--   },
--   "tokens": {
--     "long_lived_user_token": "string",
--     "token_expires_at": "timestamp",
--     "user_app_token": "string",
--     "user_app_token_expires_at": "timestamp"
--   },
--   "connection_status": "connected" | "disconnected",
--   "payment_connected": boolean,
--   "admin_connected": boolean,
--   "fb_user_id": "string",
--   "connected_at": "timestamp",
--   "updated_at": "timestamp"
-- }

-- ============================================================================
-- 5. Migration Complete
-- ============================================================================

-- This migration enables:
-- ✅ Meta connection stored in database (not localStorage)
-- ✅ Campaign-level data shared across all ads
-- ✅ AI Chat conversation persists when switching ads
-- ✅ Proper data hierarchy (campaign vs ad separation)

