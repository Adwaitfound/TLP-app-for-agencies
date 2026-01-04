-- Sync user IDs between auth.users and public.users+clients tables
-- This fixes the mismatch where public.users has old IDs

-- First, update the clients table user_id to match auth users by email
UPDATE clients c
SET user_id = au.id
FROM auth.users au
WHERE c.email = au.email
  AND c.user_id != au.id;

-- Then, update the users table ID to match auth users by email  
-- We need to do this carefully with the foreign key
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;

UPDATE users u
SET id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.id != au.id;

-- Recreate the foreign key
ALTER TABLE clients 
ADD CONSTRAINT clients_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
