-- Remove all example users created during testing
-- Run this in your Supabase SQL Editor

-- First, delete from tables that reference users (to avoid foreign key constraints)

-- Delete from clients table
DELETE FROM clients WHERE email LIKE '%example.com';

-- Delete from project_team table
DELETE FROM project_team WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%example.com'
);

-- Delete from projects (if any were created by example users)
-- Uncomment if you want to delete all projects created by example users
-- DELETE FROM projects WHERE created_by IN (
--   SELECT id FROM auth.users WHERE email LIKE '%example.com'
-- );

-- Delete from users table
DELETE FROM users WHERE email LIKE '%example.com';

-- Finally, delete from auth.users (this is the Supabase auth table)
-- This requires admin access via Supabase SQL editor
DELETE FROM auth.users WHERE email LIKE '%example.com';

-- Verify deletion
SELECT email FROM auth.users WHERE email LIKE '%example.com';
-- Should return 0 rows if successful
