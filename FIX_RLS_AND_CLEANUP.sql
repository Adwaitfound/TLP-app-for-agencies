-- ============================================
-- FIX RLS POLICIES AND CLEANUP ORPHANED USERS
-- ============================================

-- 1. Fix project_team RLS policy to allow admins to insert
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_team;
DROP POLICY IF EXISTS "Enable insert for admins and project managers" ON project_team;
DROP POLICY IF EXISTS "Enable insert for team assignment" ON project_team;

-- Create new policy allowing authenticated users to insert
CREATE POLICY "Enable insert for team assignment" ON project_team
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'project_manager')
    )
  );

-- Also ensure select policy exists
DROP POLICY IF EXISTS "Enable read for authenticated users" ON project_team;
CREATE POLICY "Enable read for authenticated users" ON project_team
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ensure update policy for admins
DROP POLICY IF EXISTS "Enable update for admins" ON project_team;
CREATE POLICY "Enable update for admins" ON project_team
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'project_manager')
    )
  );

-- Ensure delete policy for admins
DROP POLICY IF EXISTS "Enable delete for admins" ON project_team;
CREATE POLICY "Enable delete for admins" ON project_team
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'project_manager')
    )
  );

-- 2. Clean up orphaned users (users with auth but no client/user record)
-- ============================================

-- First, let's see what we have (run this in Supabase SQL editor to review):
-- SELECT 
--   au.id,
--   au.email,
--   au.created_at,
--   u.id as user_record_exists,
--   c.id as client_record_exists
-- FROM auth.users au
-- LEFT JOIN users u ON u.id = au.id
-- LEFT JOIN clients c ON c.user_id = au.id
-- WHERE u.id IS NULL AND c.id IS NULL;

-- Delete orphaned auth users who don't have user or client records
-- UNCOMMENT TO RUN (BE CAREFUL!):
-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT au.id
--   FROM auth.users au
--   LEFT JOIN users u ON u.id = au.id
--   LEFT JOIN clients c ON c.user_id = au.id
--   WHERE u.id IS NULL AND c.id IS NULL
-- );

-- 3. Alternative: Clean up specific email
-- ============================================
-- If you want to clean up just the Samspire@cafe.com user:

-- First check what exists:
SELECT 
  au.id as auth_id,
  au.email,
  u.id as user_id,
  c.id as client_id
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
LEFT JOIN clients c ON c.user_id = au.id
WHERE au.email = 'samspire@cafe.com';

-- To delete this specific user (uncomment to run):
-- DELETE FROM auth.users WHERE email = 'samspire@cafe.com';

-- 4. Check project_team RLS is enabled
-- ============================================
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'project_team';

-- If RLS is not enabled, enable it:
-- ALTER TABLE project_team ENABLE ROW LEVEL SECURITY;

-- 5. List all current RLS policies
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'project_team';
