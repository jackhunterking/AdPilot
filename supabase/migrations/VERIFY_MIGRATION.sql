-- ============================================================================
-- Verification Script for Ad Status Migration
-- Purpose: Run this after 20250114_fix_ad_status_schema.sql to verify success
-- ============================================================================

-- TEST 1: Verify column type is correct
SELECT 
  '✅ TEST 1: Column Type Check' as test_name,
  column_name, 
  data_type, 
  udt_name,
  CASE 
    WHEN data_type = 'USER-DEFINED' AND udt_name = 'ad_status_enum' 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as result
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'ads' 
  AND column_name = 'status';

-- TEST 2: Verify enum has all required values
SELECT 
  '✅ TEST 2: Enum Values Check' as test_name,
  enumlabel as status_value,
  enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = 'ad_status_enum'::regtype 
ORDER BY enumsortorder;

-- Should return 8 values:
-- draft, pending_review, active, paused, rejected, failed, learning, archived

-- TEST 3: Check old column is dropped
SELECT 
  '✅ TEST 3: Old Column Dropped' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'ads' 
        AND column_name = 'publishing_status'
    )
    THEN '❌ FAIL - publishing_status still exists'
    ELSE '✅ PASS - old column dropped'
  END as result;

-- TEST 4: Check old constraint is dropped
SELECT 
  '✅ TEST 4: Old Constraint Dropped' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'ads'
        AND constraint_name = 'ads_status_check'
    )
    THEN '❌ FAIL - ads_status_check still exists'
    ELSE '✅ PASS - old constraint dropped'
  END as result;

-- TEST 5: Data integrity - no NULL statuses
SELECT 
  '✅ TEST 5: No NULL Statuses' as test_name,
  COUNT(*) FILTER (WHERE status IS NULL) as null_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status IS NULL) = 0 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as result
FROM ads;

-- TEST 6: Status distribution (informational)
SELECT 
  '✅ TEST 6: Status Distribution' as test_name,
  status::text as status_value,
  COUNT(*) as count
FROM ads 
GROUP BY status 
ORDER BY count DESC;

-- TEST 7: Indexes exist
SELECT 
  '✅ TEST 7: Indexes Check' as test_name,
  indexname,
  CASE 
    WHEN indexname IN ('idx_ads_status', 'idx_ads_campaign_status')
    THEN '✅ Expected index exists'
    ELSE 'ℹ️  Other index'
  END as result
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'ads'
  AND indexdef LIKE '%status%';

-- TEST 8: Try updating to pending_review (THE KEY TEST!)
DO $$
DECLARE
  test_ad_id UUID;
  original_status ad_status_enum;
BEGIN
  -- Find a draft ad to test with (or create one)
  SELECT id, status INTO test_ad_id, original_status
  FROM ads 
  WHERE status = 'draft'
  LIMIT 1;
  
  IF test_ad_id IS NULL THEN
    RAISE NOTICE '⚠️  TEST 8: No draft ads found to test with';
  ELSE
    -- Try updating to pending_review
    UPDATE ads SET status = 'pending_review' WHERE id = test_ad_id;
    
    -- Verify it worked
    IF (SELECT status FROM ads WHERE id = test_ad_id) = 'pending_review' THEN
      RAISE NOTICE '✅ TEST 8: PASS - Successfully updated ad to pending_review';
      
      -- Restore original status
      UPDATE ads SET status = original_status WHERE id = test_ad_id;
      RAISE NOTICE 'Restored ad to original status: %', original_status;
    ELSE
      RAISE WARNING '❌ TEST 8: FAIL - Could not update to pending_review';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 
  '========================================' as summary;
  
SELECT 
  'MIGRATION VERIFICATION COMPLETE' as summary;
  
SELECT 
  'Review results above for any ❌ FAIL markers' as summary;
  
SELECT 
  '========================================' as summary;

