-- Create admin user in Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- 1. First create the auth user
-- Go to Authentication > Users in Supabase Dashboard and create a user:
-- Email: admin@test.com
-- Password: admin123456

-- 2. Then run this SQL to add them to the users table:
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
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;
