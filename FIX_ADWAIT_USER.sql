-- Check if user Adwait exists and set as admin
-- Run this in Supabase SQL Editor

-- First, let's see what users exist
SELECT id, email, full_name, role FROM public.users;

-- If Adwait user exists in auth but not in public.users, run this:
INSERT INTO public.users (id, email, full_name, role, company_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Adwait'),
  'admin',
  'The Lost Project'
FROM auth.users 
WHERE email LIKE '%adwait%' OR raw_user_meta_data->>'full_name' LIKE '%Adwait%'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  company_name = 'The Lost Project';

-- After running this, check again:
SELECT id, email, full_name, role FROM public.users;
