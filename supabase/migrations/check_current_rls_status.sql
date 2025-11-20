-- ============================================================================
-- Current RLS Status Check for ads table
-- ============================================================================
-- Purpose: Check what RLS policies currently exist before making changes
-- Run this FIRST to see what needs to be fixed
-- ============================================================================

-- Check 1: Is RLS enabled on ads table?
-- ============================================================================
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'ads';
-- Expected output: One row with RLS Enabled = true

-- Check 2: What policies currently exist on ads table?
-- ============================================================================
SELECT 
  policyname as "Policy Name",
  cmd as "Operation (SELECT/INSERT/UPDATE/DELETE)",
  permissive as "Permissive",
  roles as "Roles"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'ads'
ORDER BY cmd;
-- Expected output: 4 policies covering SELECT, INSERT, UPDATE, DELETE

-- Check 3: Detailed view of each policy
-- ============================================================================
SELECT 
  policyname as "Policy Name",
  cmd as "Operation",
  CASE 
    WHEN qual IS NOT NULL THEN 'USING clause present'
    ELSE 'No USING clause'
  END as "Using Check",
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK present'
    ELSE 'No WITH CHECK'
  END as "With Check"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'ads'
ORDER BY cmd;

-- Check 4: Test if campaigns table has proper RLS (ads policies depend on it)
-- ============================================================================
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'campaigns';

SELECT 
  policyname as "Policy Name",
  cmd as "Operation"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'campaigns'
ORDER BY cmd;
-- This is important because ads policies check campaign ownership

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- 
-- If "ads" table shows RLS Enabled = false:
--   → Need to run: ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
--
-- If less than 4 policies exist on ads:
--   → Missing policies need to be created
--   → Run the verify_and_setup_ads_rls.sql script
--
-- If policies exist but draft ads still fail:
--   → Check campaigns table RLS (must allow SELECT for user's own campaigns)
--   → Verify auth.uid() returns correct user ID
--
-- If 4 policies exist and RLS is enabled:
--   → RLS is properly configured
--   → Issues may be elsewhere (check API routes, auth tokens)
-- ============================================================================

