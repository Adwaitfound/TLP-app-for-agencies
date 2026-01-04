-- Check what columns exist in users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Check data in public.users table
SELECT id, email, full_name, role, created_at
FROM public.users
ORDER BY created_at DESC;

-- Check what columns exist in clients table  
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clients'
ORDER BY ordinal_position;

-- Check data in clients table
SELECT id, user_id, email, company_name, contact_person, status
FROM clients
ORDER BY created_at DESC;

-- Find auth users that DON'T have public.users records
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN pu.id IS NULL THEN '❌ Missing' ELSE '✅ Exists' END as in_public_users,
  CASE WHEN c.id IS NULL THEN '❌ Missing' ELSE '✅ Exists' END as in_clients
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN clients c ON au.id = c.user_id
ORDER BY au.created_at DESC;
