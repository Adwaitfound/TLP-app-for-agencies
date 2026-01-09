-- Fix client user association for dashboard access
-- Ensures all client users have proper database records

-- Step 1: Ensure all auth.users have public.users records with correct role
INSERT INTO public.users (id, email, full_name, role, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)) as full_name,
  (CASE 
    WHEN au.email LIKE '%@thelostproject.in' AND au.email NOT LIKE 'admin%' THEN 'client'
    ELSE COALESCE(au.raw_user_meta_data->>'role', 'client')
  END)::user_role as role,
  'approved' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = (CASE 
    WHEN EXCLUDED.email LIKE '%@thelostproject.in' AND EXCLUDED.email NOT LIKE 'admin%' THEN 'client'
    ELSE EXCLUDED.role::text
  END)::user_role,
  updated_at = NOW();

-- Step 2: Ensure all client role users have clients records
INSERT INTO clients (user_id, email, company_name, contact_person, status, total_projects, total_revenue, created_at)
SELECT 
  pu.id as user_id,
  pu.email,
  COALESCE(SPLIT_PART(pu.email, '@', 1), 'Unknown Company') as company_name,
  COALESCE(pu.full_name, SPLIT_PART(pu.email, '@', 1)) as contact_person,
  'active' as status,
  0 as total_projects,
  0 as total_revenue,
  pu.created_at
FROM public.users pu
LEFT JOIN clients c ON pu.id = c.user_id
WHERE c.id IS NULL
  AND pu.role = 'client'
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email;
