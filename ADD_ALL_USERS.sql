-- Add all existing auth users to public.users table with proper roles

-- Add Adwait as admin
INSERT INTO public.users (id, email, full_name, role, company_name)
SELECT 
  id,
  email,
  'Adwait Parchure',
  'admin',
  'The Lost Project'
FROM auth.users 
WHERE email = 'adwait@thelostproject.in'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  full_name = 'Adwait Parchure',
  company_name = 'The Lost Project';

-- Add employee user
INSERT INTO public.users (id, email, full_name, role, company_name)
SELECT 
  id,
  email,
  'Employee User',
  'project_manager',
  'The Lost Project'
FROM auth.users 
WHERE email = 'employee@thelostproject.in'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'project_manager',
  full_name = 'Employee User';

-- Add client users
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  id,
  email,
  'Client User',
  'client'
FROM auth.users 
WHERE email IN ('client@example.com', 'client@thelostproject.in')
ON CONFLICT (id) DO UPDATE
SET 
  role = 'client',
  full_name = 'Client User';

-- Verify all users were added
SELECT id, email, full_name, role, company_name FROM public.users ORDER BY role, email;
