-- ============================================
-- POPULATE MISSING USER AND CLIENT RECORDS
-- ============================================
-- This script creates public.users and clients records
-- for all auth.users that are missing them
-- ============================================

-- Create public.users records for auth users that are missing
INSERT INTO public.users (id, email, full_name, role, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'client') as role,
  'approved' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- Create clients records for users with role='client' who are missing from clients table
INSERT INTO clients (user_id, email, company_name, contact_person, status, total_projects, total_revenue, created_at, updated_at)
SELECT 
  pu.id as user_id,
  pu.email,
  COALESCE(SPLIT_PART(pu.email, '@', 1), 'Unknown Company') as company_name,
  COALESCE(pu.full_name, SPLIT_PART(pu.email, '@', 1)) as contact_person,
  'active' as status,
  0 as total_projects,
  0 as total_revenue,
  pu.created_at,
  NOW() as updated_at
FROM public.users pu
LEFT JOIN clients c ON pu.id = c.user_id
WHERE c.id IS NULL
  AND pu.role = 'client'
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- Verification
SELECT '✅ Step 1: Created missing public.users records' as status;
SELECT '✅ Step 2: Created missing clients records' as status;

-- Show what was created
SELECT 'Total public.users now:' as info, COUNT(*) as count FROM public.users;
SELECT 'Total clients now:' as info, COUNT(*) as count FROM clients;

-- List all users with their status
SELECT 
  au.email,
  CASE WHEN pu.id IS NOT NULL THEN '✅' ELSE '❌' END as has_public_user,
  COALESCE(pu.role, 'N/A') as role,
  CASE WHEN c.id IS NOT NULL THEN '✅' ELSE '❌' END as has_client
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN clients c ON au.id = c.user_id
ORDER BY au.created_at DESC;

SELECT '✅ All missing records populated!' as final_status;
