-- ============================================
-- COMPREHENSIVE RLS FIX FOR SINGLE INSTANCE
-- Remove multi-tenant restrictions and fix all policies
-- ============================================

-- This script fixes all RLS policies that were left from the multi-instance build attempt
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- 1. PROJECT_TEAM TABLE
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_team;
DROP POLICY IF EXISTS "Enable insert for admins and project managers" ON project_team;
DROP POLICY IF EXISTS "Enable insert for team assignment" ON project_team;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON project_team;
DROP POLICY IF EXISTS "Enable update for admins" ON project_team;
DROP POLICY IF EXISTS "Enable delete for admins" ON project_team;

-- Create simple policies for single instance
CREATE POLICY "Allow all for authenticated users" ON project_team
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 2. CLIENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for admins" ON clients;
DROP POLICY IF EXISTS "Enable update for admins" ON clients;
DROP POLICY IF EXISTS "Enable delete for admins" ON clients;

CREATE POLICY "Allow all for authenticated users" ON clients
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 3. PROJECTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable update for project owners" ON projects;
DROP POLICY IF EXISTS "Enable delete for admins" ON projects;

CREATE POLICY "Allow all for authenticated users" ON projects
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 4. USERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for own record" ON users;
DROP POLICY IF EXISTS "Enable update for admins" ON users;

CREATE POLICY "Allow all for authenticated users" ON users
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 5. PROJECT_FILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON project_files;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_files;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON project_files;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON project_files;

CREATE POLICY "Allow all for authenticated users" ON project_files
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 6. MILESTONES TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON milestones;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON milestones;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON milestones;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON milestones;

CREATE POLICY "Allow all for authenticated users" ON milestones
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 7. INVOICES TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON invoices;

CREATE POLICY "Allow all for authenticated users" ON invoices
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 8. PROJECT_COMMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Enable read for authenticated users" ON project_comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_comments;
DROP POLICY IF EXISTS "Enable update for own comments" ON project_comments;
DROP POLICY IF EXISTS "Enable delete for own comments" ON project_comments;

CREATE POLICY "Allow all for authenticated users" ON project_comments
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 9. SUB_PROJECTS TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sub_projects') THEN
    DROP POLICY IF EXISTS "Enable read for authenticated users" ON sub_projects;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sub_projects;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON sub_projects;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON sub_projects;

    CREATE POLICY "Allow all for authenticated users" ON sub_projects
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- 10. NOTIFICATIONS TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    DROP POLICY IF EXISTS "Enable read for own notifications" ON notifications;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON notifications;
    DROP POLICY IF EXISTS "Enable update for own notifications" ON notifications;
    DROP POLICY IF EXISTS "Enable delete for own notifications" ON notifications;

    CREATE POLICY "Allow all for authenticated users" ON notifications
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- 11. AUDIT_LOGS TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    DROP POLICY IF EXISTS "Enable read for authenticated users" ON audit_logs;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON audit_logs;

    CREATE POLICY "Allow all for authenticated users" ON audit_logs
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- 12. CALENDAR_EVENTS TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    DROP POLICY IF EXISTS "Enable read for authenticated users" ON calendar_events;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON calendar_events;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON calendar_events;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON calendar_events;

    CREATE POLICY "Allow all for authenticated users" ON calendar_events
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- 13. TIME_TRACKING TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'time_tracking') THEN
    DROP POLICY IF EXISTS "Enable read for authenticated users" ON time_tracking;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON time_tracking;
    DROP POLICY IF EXISTS "Enable update for own records" ON time_tracking;
    DROP POLICY IF EXISTS "Enable delete for own records" ON time_tracking;

    CREATE POLICY "Allow all for authenticated users" ON time_tracking
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- CLEANUP: Remove orphaned auth users
-- ============================================

-- First, check what orphaned users exist (review before deleting):
SELECT 
  au.id as auth_id,
  au.email,
  au.created_at,
  u.id as user_record,
  c.id as client_record
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
LEFT JOIN clients c ON c.user_id = au.id
WHERE u.id IS NULL AND c.id IS NULL
ORDER BY au.created_at DESC;

-- UNCOMMENT TO DELETE ORPHANED AUTH USERS:
-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT au.id
--   FROM auth.users au
--   LEFT JOIN users u ON u.id = au.id
--   LEFT JOIN clients c ON c.user_id = au.id
--   WHERE u.id IS NULL AND c.id IS NULL
-- );

-- Delete specific orphaned user (samspire@cafe.com):
DELETE FROM auth.users WHERE email = 'samspire@cafe.com' AND id NOT IN (SELECT id FROM users UNION SELECT user_id FROM clients);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
  'users', 'clients', 'projects', 'project_team', 'project_files',
  'milestones', 'invoices', 'project_comments', 'sub_projects',
  'notifications', 'audit_logs', 'calendar_events', 'time_tracking'
)
ORDER BY tablename;

-- Check all policies are in place
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count records in key tables to ensure nothing was lost
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'project_team', COUNT(*) FROM project_team
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'milestones', COUNT(*) FROM milestones;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'RLS policies have been reset to single-instance mode!' as status;
