-- Fix client user association for dashboard access
-- This script ensures that all client users have proper public.users and clients records

-- Step 1: Check current state
SELECT 
  au.id,
  au.email,
  COALESCE(pu.id, 'MISSING') as has_public_user,
  COALESCE(pu.role, 'N/A') as role,
  COALESCE(c.id, 'MISSING') as has_client_record
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN clients c ON au.id = c.user_id
ORDER BY au.created_at DESC;

-- Step 2: Ensure all auth.users have public.users records with correct role
INSERT INTO public.users (id, email, full_name, role, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)) as full_name,
  CASE 
    WHEN au.email LIKE '%@thelostproject.in' AND au.email NOT LIKE 'admin%' THEN 'client'
    ELSE COALESCE(au.raw_user_meta_data->>'role', 'client')
  END as role,
  'approved' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = CASE 
    WHEN EXCLUDED.email LIKE '%@thelostproject.in' AND EXCLUDED.email NOT LIKE 'admin%' THEN 'client'
    ELSE EXCLUDED.role
  END,
  updated_at = NOW();

-- Step 3: Ensure all client role users have clients records
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

-- Step 4: Verify results
SELECT 
  '✅ FINAL STATE - Client User Association' as status;

SELECT 
  au.email,
  CASE WHEN pu.id IS NOT NULL THEN '✅' ELSE '❌' END as has_public_user,
  COALESCE(pu.role, 'N/A') as role,
  CASE WHEN c.id IS NOT NULL THEN '✅' ELSE '❌' END as has_client_record,
  COALESCE(c.id, 'N/A') as client_id
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN clients c ON au.id = c.user_id
WHERE au.email LIKE '%@thelostproject.in'
ORDER BY au.created_at DESC;

SELECT '✅ All client users should now have access to their dashboards!' as final_note;
