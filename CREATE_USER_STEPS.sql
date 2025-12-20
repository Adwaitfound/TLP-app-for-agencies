-- Step 1: Create auth user manually in Supabase Dashboard
-- Go to: Authentication > Users > Add User
-- Email: admin@test.com
-- Password: admin123456
-- Auto Confirm User: YES

-- Step 2: After creating the auth user, run this SQL to add them to public.users:
INSERT INTO public.users (id, email, full_name, role, company_name)
SELECT 
  id,
  email,
  'Admin User',
  'admin',
  'The Lost Project'
FROM auth.users 
WHERE email = 'admin@test.com'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  full_name = 'Admin User',
  company_name = 'The Lost Project';

-- Verify it worked:
SELECT id, email, full_name, role FROM public.users WHERE role = 'admin';
