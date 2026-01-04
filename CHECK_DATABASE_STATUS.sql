-- ============================================
-- DATABASE STATUS CHECK
-- ============================================
-- Run this in Supabase SQL Editor to check database state
-- https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql/new
-- ============================================

-- 1. List all tables
SELECT '========== ALL TABLES ==========' as info;
SELECT 
  tablename as table_name
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check for agency columns (should be empty)
SELECT '' as separator, '========== AGENCY COLUMNS (should be empty) ==========' as info;
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'agency_id';

-- 3. List all users in public.users table
SELECT '' as separator, '========== PUBLIC.USERS TABLE ==========' as info;
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- 4. List all users in auth.users (authentication)
SELECT '' as separator, '========== AUTH.USERS (Authentication) ==========' as info;
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 5. Count records in key tables
SELECT '' as separator, '========== RECORD COUNTS ==========' as info;
SELECT 'clients' as table_name, COUNT(*) as record_count FROM clients
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'project_team', COUNT(*) FROM project_team
UNION ALL
SELECT 'project_files', COUNT(*) FROM project_files
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'milestones', COUNT(*) FROM milestones
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- 6. List all RLS policies
SELECT '' as separator, '========== RLS POLICIES ==========' as info;
SELECT 
  tablename as table_name,
  policyname as policy_name,
  cmd as operation,
  CASE 
    WHEN policyname = 'Allow all for authenticated users' THEN '✅ Single-instance'
    ELSE '⚠️  Custom'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Check RLS status for all tables
SELECT '' as separator, '========== RLS STATUS ==========' as info;
SELECT 
  tablename as table_name,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 8. Check if agency tables exist (should NOT exist)
SELECT '' as separator, '========== AGENCY TABLES (should NOT exist) ==========' as info;
SELECT 
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('agencies', 'user_agencies', 'agency_onboarding_requests');

SELECT '' as separator, '========== SUMMARY ==========' as info;
SELECT 
  '✅ Database check complete!' as status,
  'If you see no users, run CREATE_ADMIN_NOW.sql next' as next_step;
