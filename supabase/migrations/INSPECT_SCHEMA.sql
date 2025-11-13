-- ============================================================================
-- Schema Inspection Queries
-- Purpose: Investigate current ads table schema before migration
-- Run these in Supabase SQL Editor to understand current state
-- ============================================================================

-- Query 1: Check what columns exist on ads table
SELECT 
  column_name, 
  data_type, 
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'ads' 
  AND column_name IN ('status', 'publishing_status')
ORDER BY column_name;

-- Query 2: Check existing constraints on ads table
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'ads'
  AND constraint_name LIKE '%status%';

-- Query 3: Get CHECK constraint definition
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'ads'
  AND con.contype = 'c'
  AND con.conname LIKE '%status%';

-- Query 4: Check for any indexes on status columns
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'ads'
  AND indexdef LIKE '%status%';

-- Query 5: Check if ad_status_enum exists
SELECT 
  enumlabel,
  enumsortorder
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'ad_status_enum'
)
ORDER BY enumsortorder;

-- Query 6: Count current ads by status
SELECT 
  status,
  COUNT(*) as count
FROM ads 
GROUP BY status 
ORDER BY count DESC;

-- Query 7: Count by publishing_status (if column exists)
SELECT 
  publishing_status,
  COUNT(*) as count
FROM ads 
GROUP BY publishing_status 
ORDER BY count DESC;

-- Query 8: Check for any NULL statuses
SELECT 
  COUNT(*) as null_status_count,
  COUNT(*) FILTER (WHERE publishing_status IS NULL) as null_publishing_status_count
FROM ads;

-- Query 9: Sample data to see both columns
SELECT 
  id,
  name,
  status,
  publishing_status,
  created_at
FROM ads
LIMIT 5;

