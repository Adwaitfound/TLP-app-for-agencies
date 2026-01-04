-- ============================================
-- REVERT TO SINGLE INSTANCE FROM MULTI-TENANT
-- ============================================
-- This script:
-- 1. Removes agency_id columns from all tables
-- 2. Drops agency-related tables
-- 3. Resets all RLS policies to simple single-instance mode
-- 4. Cleans up helper functions
-- ============================================

-- ============================================
-- STEP 1: Remove agency_id columns
-- ============================================

ALTER TABLE IF EXISTS clients DROP COLUMN IF EXISTS agency_id CASCADE;
ALTER TABLE IF EXISTS projects DROP COLUMN IF EXISTS agency_id CASCADE;
ALTER TABLE IF EXISTS project_files DROP COLUMN IF EXISTS agency_id CASCADE;
ALTER TABLE IF EXISTS project_comments DROP COLUMN IF EXISTS agency_id CASCADE;
ALTER TABLE IF EXISTS invoices DROP COLUMN IF EXISTS agency_id CASCADE;
ALTER TABLE IF EXISTS invoice_items DROP COLUMN IF EXISTS agency_id CASCADE;
ALTER TABLE IF EXISTS milestones DROP COLUMN IF EXISTS agency_id CASCADE;

-- ============================================
-- STEP 2: Drop multi-tenant helper functions
-- ============================================

DROP FUNCTION IF EXISTS public.agency_accessible(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_rls_policy_if_not_exists(text, text, text, text, text) CASCADE;

-- ============================================
-- STEP 3: Drop agency tables
-- ============================================

DROP TABLE IF EXISTS user_agencies CASCADE;
DROP TABLE IF EXISTS agency_onboarding_requests CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;

-- ============================================
-- STEP 4: Drop ALL existing policies
-- ============================================

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_team;
DROP POLICY IF EXISTS "Enable insert for admins and project managers" ON project_team;
DROP POLICY IF EXISTS "Enable insert for team assignment" ON project_team;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON project_team;
DROP POLICY IF EXISTS "Enable update for admins" ON project_team;
DROP POLICY IF EXISTS "Enable delete for admins" ON project_team;
DROP POLICY IF EXISTS "project_team_select" ON project_team;
DROP POLICY IF EXISTS "project_team_insert" ON project_team;
DROP POLICY IF EXISTS "project_team_update" ON project_team;
DROP POLICY IF EXISTS "project_team_delete" ON project_team;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON project_team;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for admins" ON clients;
DROP POLICY IF EXISTS "Enable update for admins" ON clients;
DROP POLICY IF EXISTS "Enable delete for admins" ON clients;
DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON clients;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable update for project owners" ON projects;
DROP POLICY IF EXISTS "Enable delete for admins" ON projects;
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projects;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for own record" ON users;
DROP POLICY IF EXISTS "Enable update for admins" ON users;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON users;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON project_files;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_files;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON project_files;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON project_files;
DROP POLICY IF EXISTS "project_files_select" ON project_files;
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
DROP POLICY IF EXISTS "project_files_update" ON project_files;
DROP POLICY IF EXISTS "project_files_delete" ON project_files;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON project_files;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON milestones;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON milestones;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON milestones;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON milestones;
DROP POLICY IF EXISTS "milestones_select" ON milestones;
DROP POLICY IF EXISTS "milestones_insert" ON milestones;
DROP POLICY IF EXISTS "milestones_update" ON milestones;
DROP POLICY IF EXISTS "milestones_delete" ON milestones;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON milestones;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON invoices;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON invoices;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON project_comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON project_comments;
DROP POLICY IF EXISTS "Enable update for own comments" ON project_comments;
DROP POLICY IF EXISTS "Enable delete for own comments" ON project_comments;
DROP POLICY IF EXISTS "project_comments_select" ON project_comments;
DROP POLICY IF EXISTS "project_comments_insert" ON project_comments;
DROP POLICY IF EXISTS "project_comments_update" ON project_comments;
DROP POLICY IF EXISTS "project_comments_delete" ON project_comments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON project_comments;

-- ============================================
-- STEP 5: Create simple single-instance policies
-- ============================================

CREATE POLICY "Allow all for authenticated users" ON project_team
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON clients
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON projects
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON users
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON project_files
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON milestones
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON invoices
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated users" ON project_comments
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 6: Handle optional tables  
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoice_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "invoice_items_select" ON invoice_items';
    EXECUTE 'DROP POLICY IF EXISTS "invoice_items_insert" ON invoice_items';
    EXECUTE 'DROP POLICY IF EXISTS "invoice_items_update" ON invoice_items';
    EXECUTE 'DROP POLICY IF EXISTS "invoice_items_delete" ON invoice_items';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON invoice_items';
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON invoice_items FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sub_projects') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Enable read for authenticated users" ON sub_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sub_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Enable update for authenticated users" ON sub_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Enable delete for authenticated users" ON sub_projects';
    EXECUTE 'DROP POLICY IF EXISTS "sub_projects_select" ON sub_projects';
    EXECUTE 'DROP POLICY IF EXISTS "sub_projects_insert" ON sub_projects';
    EXECUTE 'DROP POLICY IF EXISTS "sub_projects_update" ON sub_projects';
    EXECUTE 'DROP POLICY IF EXISTS "sub_projects_delete" ON sub_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON sub_projects';
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON sub_projects FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Enable read for own notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for authenticated users" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Enable update for own notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Enable delete for own notifications" ON notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON notifications';
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON notifications FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Enable read for authenticated users" ON audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for authenticated users" ON audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON audit_logs';
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON audit_logs FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Enable read for authenticated users" ON calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for authenticated users" ON calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Enable update for authenticated users" ON calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Enable delete for authenticated users" ON calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON calendar_events';
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON calendar_events FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vendors') THEN
    EXECUTE 'DROP POLICY IF EXISTS "vendors_select" ON vendors';
    EXECUTE 'DROP POLICY IF EXISTS "vendors_insert" ON vendors';
    EXECUTE 'DROP POLICY IF EXISTS "vendors_update" ON vendors';
    EXECUTE 'DROP POLICY IF EXISTS "vendors_delete" ON vendors';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON vendors';
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON vendors FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "payments_select" ON payments';
    EXECUTE 'DROP POLICY IF EXISTS "payments_insert" ON payments';
    EXECUTE 'DROP POLICY IF EXISTS "payments_update" ON payments';
    EXECUTE 'DROP POLICY IF EXISTS "payments_delete" ON payments';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON payments';
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON payments FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'web_push_subscriptions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "web_push_subscriptions_select" ON web_push_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "web_push_subscriptions_insert" ON web_push_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "web_push_subscriptions_update" ON web_push_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "web_push_subscriptions_delete" ON web_push_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON web_push_subscriptions';
    EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON web_push_subscriptions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Step 1: Agency columns removed' as status;
SELECT '✅ Step 2: Agency tables dropped' as status;
SELECT '✅ Step 3: All RLS policies reset to single-instance' as status;

-- List all tables with RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all current policies
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify agency columns are gone
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'agency_id';

SELECT '✅ Successfully reverted to single-instance mode!' as final_status;

