-- Migration: Add Location Targeting Performance Indexes
-- Purpose: Optimize location queries per MASTER_API_DOCUMENTATION
-- References: MASTER_PROJECT_ARCHITECTURE Section 4 (Database Architecture)

-- Index for ad_id lookups (primary query pattern)
CREATE INDEX IF NOT EXISTS idx_ad_target_locations_ad_id 
ON ad_target_locations(ad_id);

-- Composite index for ad_id + inclusion_mode (filter by mode)
CREATE INDEX IF NOT EXISTS idx_ad_target_locations_mode 
ON ad_target_locations(ad_id, inclusion_mode);

-- Index for location name searches
CREATE INDEX IF NOT EXISTS idx_ad_target_locations_name 
ON ad_target_locations(location_name);

-- Comment documenting indexes
COMMENT ON INDEX idx_ad_target_locations_ad_id IS 
'Optimizes location lookup by ad_id (primary query pattern)';

COMMENT ON INDEX idx_ad_target_locations_mode IS 
'Optimizes filtering locations by inclusion/exclusion mode';

COMMENT ON INDEX idx_ad_target_locations_name IS 
'Optimizes location name searches and deduplication';

