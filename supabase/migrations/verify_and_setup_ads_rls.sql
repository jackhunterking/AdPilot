-- ============================================================================
-- RLS Policy Verification and Setup for ads table
-- ============================================================================
-- Purpose: Ensure Row Level Security policies are properly configured
-- Reference: RLS_VERIFICATION_GUIDE.md
-- ============================================================================

-- Step 1: Enable RLS on ads table (if not already enabled)
-- ============================================================================
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any) to avoid conflicts
-- ============================================================================
DROP POLICY IF EXISTS "Users can select ads from their own campaigns" ON ads;
DROP POLICY IF EXISTS "Users can insert ads to their own campaigns" ON ads;
DROP POLICY IF EXISTS "Users can update their own ads" ON ads;
DROP POLICY IF EXISTS "Users can delete their own ads" ON ads;

-- Step 3: Create SELECT Policy (Read)
-- ============================================================================
-- Allows users to view ads that belong to their campaigns
CREATE POLICY "Users can select ads from their own campaigns"
ON ads FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Step 4: Create INSERT Policy (Create)
-- ============================================================================
-- Allows users to create new ads in their own campaigns
-- CRITICAL: Required for draft ad creation to work
CREATE POLICY "Users can insert ads to their own campaigns"
ON ads FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Step 5: Create UPDATE Policy (Modify)
-- ============================================================================
-- Allows users to update ads in their campaigns
CREATE POLICY "Users can update their own ads"
ON ads FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Step 6: Create DELETE Policy (Remove)
-- ============================================================================
-- Allows users to delete ads from their campaigns
CREATE POLICY "Users can delete their own ads"
ON ads FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = ads.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these queries after executing the above to verify policies exist

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'ads';
-- Expected: rowsecurity = true

-- List all policies on ads table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'ads'
ORDER BY cmd;
-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)

