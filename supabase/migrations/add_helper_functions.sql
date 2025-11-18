-- Migration: Add API v1 Helper Functions
-- Purpose: Ownership verification helpers per MASTER_API_DOCUMENTATION
-- References: MASTER_PROJECT_ARCHITECTURE Section 4.2 (Helper Functions)

-- Helper function: user_owns_ad
-- Purpose: Verify user owns an ad (via campaign relation)
CREATE OR REPLACE FUNCTION user_owns_ad(p_ad_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM ads a
    JOIN campaigns c ON c.id = a.campaign_id
    WHERE a.id = p_ad_id AND c.user_id = p_user_id
  );
END;
$$;

-- Comment documenting function
COMMENT ON FUNCTION user_owns_ad(UUID, UUID) IS 
'Verify user owns an ad via campaign ownership relation. Used in API v1 for ownership checks.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION user_owns_ad(UUID, UUID) TO authenticated;

-- Helper function: get_ad_locations_count
-- Purpose: Get count of locations for an ad
CREATE OR REPLACE FUNCTION get_ad_locations_count(p_ad_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  include_count BIGINT,
  exclude_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE inclusion_mode = 'include')::BIGINT as include_count,
    COUNT(*) FILTER (WHERE inclusion_mode = 'exclude')::BIGINT as exclude_count
  FROM ad_target_locations
  WHERE ad_id = p_ad_id;
END;
$$;

-- Comment
COMMENT ON FUNCTION get_ad_locations_count(UUID) IS 
'Get location counts (total, included, excluded) for an ad';

-- Grant execute
GRANT EXECUTE ON FUNCTION get_ad_locations_count(UUID) TO authenticated;

