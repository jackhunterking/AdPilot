-- ============================================================================
-- Meta Ad Publishing Performance Indexes
-- Purpose: Optimize queries for the publishing pipeline
-- Created: 2025-01-19
-- References: Phase 1.4 of Meta Ad Publishing Implementation
-- ============================================================================

-- Index for campaigns.published_status queries
-- Used when filtering campaigns by publish status
CREATE INDEX IF NOT EXISTS idx_campaigns_published_status 
ON campaigns(published_status) 
WHERE published_status IS NOT NULL;

-- Index for meta_published_campaigns.publish_status
-- Used for checking publish status and filtering
CREATE INDEX IF NOT EXISTS idx_meta_published_campaigns_status
ON meta_published_campaigns(publish_status);

-- Index for campaign_meta_connections.campaign_id
-- Used for fast lookups of Meta connections by campaign
CREATE INDEX IF NOT EXISTS idx_campaign_meta_connections_campaign
ON campaign_meta_connections(campaign_id);

-- Composite index for ads queries (campaign_id + status)
-- Used for filtering ads by campaign and status
CREATE INDEX IF NOT EXISTS idx_ads_campaign_status
ON ads(campaign_id, status);

-- Index for ads.meta_ad_id for reverse lookups
-- Used when verifying published ads
CREATE INDEX IF NOT EXISTS idx_ads_meta_ad_id
ON ads(meta_ad_id)
WHERE meta_ad_id IS NOT NULL;

-- Index for campaign_states.campaign_id
-- Used for fast lookups of campaign state data
CREATE INDEX IF NOT EXISTS idx_campaign_states_campaign_id
ON campaign_states(campaign_id);

-- Index for meta_published_campaigns.campaign_id
-- Used for fast lookups of published campaign data
CREATE INDEX IF NOT EXISTS idx_meta_published_campaigns_campaign_id
ON meta_published_campaigns(campaign_id);

-- Composite index for campaign_meta_connections token expiry checks
-- Used for validating token freshness before publishing
CREATE INDEX IF NOT EXISTS idx_campaign_meta_connections_token_expiry
ON campaign_meta_connections(campaign_id, token_expires_at)
WHERE token_expires_at IS NOT NULL;

-- Index for campaign_meta_connections.selected_ad_account_id
-- Used for grouping campaigns by ad account
CREATE INDEX IF NOT EXISTS idx_campaign_meta_connections_ad_account
ON campaign_meta_connections(selected_ad_account_id)
WHERE selected_ad_account_id IS NOT NULL;

-- ============================================================================
-- NOTES:
-- - Indexes are created with IF NOT EXISTS to be idempotent
-- - Partial indexes (WHERE clauses) are used to reduce index size
-- - Composite indexes should list most selective columns first
-- - These indexes support the publishing pipeline's query patterns
-- ============================================================================

