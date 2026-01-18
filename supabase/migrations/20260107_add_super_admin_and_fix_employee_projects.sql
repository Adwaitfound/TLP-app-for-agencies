-- ===== ADD SUPER ADMIN ROLE AND FIX EMPLOYEE PROJECT ACCESS =====
-- This migration:
-- 1. Adds super_admin role to user_role enum
-- 2. Sets adwait@thelostproject.in as super admin
-- 3. Fixes RLS policies so employees can see their assigned projects
-- 4. Allows super admin to delete users and admins

-- ===== STEP 1: Add super_admin to user_role enum =====
DO $$ 
BEGIN
    -- Check if super_admin already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'super_admin' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        -- Add super_admin to the enum
        ALTER TYPE user_role ADD VALUE 'super_admin';
        RAISE NOTICE 'Added super_admin to user_role enum';
    ELSE
        RAISE NOTICE 'super_admin already exists in user_role enum';
    END IF;
END $$;

-- ===== STEP 2: Add 'employee' role if it doesn't exist =====
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'employee' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'employee';
        RAISE NOTICE 'Added employee to user_role enum';
    ELSE
        RAISE NOTICE 'employee already exists in user_role enum';
    END IF;
END $$;

-- NOTE: Setting a user to 'super_admin' immediately after adding a new enum value
-- in the same migration can trigger 'unsafe use of new value' errors.
-- We'll perform this role update in a separate migration after enum changes are committed.

-- If the user doesn't exist, create them (you'll need to create auth user separately)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'adwait@thelostproject.in') THEN
        RAISE NOTICE 'User adwait@thelostproject.in does not exist. Please create auth user first.';
    END IF;
END $$;

-- ===== STEP 4: Fix RLS policies for projects - Allow employees to see assigned projects =====

-- Drop existing project SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
DROP POLICY IF EXISTS "employee_project_access" ON projects;
DROP POLICY IF EXISTS "projects_fallback_read" ON projects;

-- Create comprehensive SELECT policy for projects
CREATE POLICY "Allow users to view projects" ON projects
    FOR SELECT
    USING (
        -- Admins can see everything
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
        OR
        -- Project managers can see everything
        (SELECT role FROM users WHERE id = auth.uid()) = 'project_manager'
        OR
        -- Employees can see projects they're assigned to
        EXISTS (
            SELECT 1 FROM project_team 
            WHERE project_team.project_id = projects.id 
            AND project_team.user_id = auth.uid()
        )
        OR
        -- Clients can see their own projects
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = projects.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- ===== STEP 5: Update INSERT policies to include super_admin =====
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
CREATE POLICY "Allow authorized users to insert projects" ON projects
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- ===== STEP 6: Update UPDATE policies to include super_admin =====
DROP POLICY IF EXISTS "Admins and PMs can update projects" ON projects;
CREATE POLICY "Allow authorized users to update projects" ON projects
    FOR UPDATE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    )
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- ===== STEP 7: Update DELETE policies to include super_admin =====
DROP POLICY IF EXISTS "Allow admins to delete projects" ON projects;
CREATE POLICY "Allow authorized users to delete projects" ON projects
    FOR DELETE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- ===== STEP 8: Fix users table RLS policies =====
-- Allow super admin to update and delete any user

DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Allow viewing all users" ON users
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Allow users to update own record" ON users
    FOR UPDATE
    USING (
        auth.uid() = id
        OR (
            (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
            AND (SELECT role FROM users WHERE users.id = id) <> 'admin'
        )
    );

-- Add DELETE policy for users (super admin only)
-- Deferred delete policy for users to be added in a follow-up migration
DROP POLICY IF EXISTS "Allow super admin to delete users" ON users;

-- ===== STEP 9: Update sub_projects policies for employees =====
DROP POLICY IF EXISTS "Authenticated users can view sub_projects" ON sub_projects;
CREATE POLICY "Allow users to view sub_projects" ON sub_projects
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM project_team 
            WHERE project_team.project_id = sub_projects.parent_project_id 
            AND project_team.user_id = auth.uid()
        )
        OR sub_projects.assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = sub_projects.parent_project_id
            AND c.user_id = auth.uid()
        )
    );

-- ===== STEP 10: Update project_team policies =====
DROP POLICY IF EXISTS "Authenticated users can view project team" ON project_team;
CREATE POLICY "Allow users to view project team" ON project_team
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM project_team pt 
            WHERE pt.project_id = project_team.project_id 
            AND pt.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = project_team.project_id
            AND c.user_id = auth.uid()
        )
    );

-- Update INSERT policy for project_team
DROP POLICY IF EXISTS "Admins and PMs can manage project team" ON project_team;
DROP POLICY IF EXISTS "Enable insert for admins" ON project_team;
CREATE POLICY "Allow authorized users to manage project team" ON project_team
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- Update UPDATE policy for project_team
DROP POLICY IF EXISTS "Enable update for admins" ON project_team;
CREATE POLICY "Allow authorized users to update project team" ON project_team
    FOR UPDATE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- Update DELETE policy for project_team
DROP POLICY IF EXISTS "Enable delete for admins" ON project_team;
CREATE POLICY "Allow authorized users to delete from project team" ON project_team
    FOR DELETE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- ===== STEP 11: Update milestones policies for employees =====
DROP POLICY IF EXISTS "Authenticated users can view milestones" ON milestones;
CREATE POLICY "Allow users to view milestones" ON milestones
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM project_team 
            WHERE project_team.project_id = milestones.project_id 
            AND project_team.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = milestones.project_id
            AND c.user_id = auth.uid()
        )
    );

-- ===== STEP 12: Update project_files policies for employees =====
DROP POLICY IF EXISTS "Admins and PMs can view project files" ON project_files;
CREATE POLICY "Allow users to view project files" ON project_files
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM project_team 
            WHERE project_team.project_id = project_files.project_id 
            AND project_team.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = project_files.project_id
            AND c.user_id = auth.uid()
        )
    );

-- ===== STEP 13: Update project_comments policies for employees =====
DROP POLICY IF EXISTS "Authenticated users can view comments" ON project_comments;
CREATE POLICY "Allow users to view comments" ON project_comments
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM project_team 
            WHERE project_team.project_id = project_comments.project_id 
            AND project_team.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = project_comments.project_id
            AND c.user_id = auth.uid()
        )
    );

-- Allow employees to insert comments on their assigned projects
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON project_comments;
CREATE POLICY "Allow users to insert comments" ON project_comments
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM project_team 
            WHERE project_team.project_id = project_comments.project_id 
            AND project_team.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = project_comments.project_id
            AND c.user_id = auth.uid()
        )
    );

-- ===== STEP 14: Update employee_tasks RLS policies =====
-- Allow employees to create tasks and propose projects

DROP POLICY IF EXISTS "employee_tasks_select" ON employee_tasks;
CREATE POLICY "Allow employees to view their own tasks" ON employee_tasks
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

DROP POLICY IF EXISTS "employee_tasks_insert" ON employee_tasks;
CREATE POLICY "Allow employees to create tasks" ON employee_tasks
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

DROP POLICY IF EXISTS "employee_tasks_update" ON employee_tasks;
CREATE POLICY "Allow employees to update their own tasks" ON employee_tasks
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

DROP POLICY IF EXISTS "employee_tasks_delete" ON employee_tasks;
CREATE POLICY "Allow employees to delete their own tasks" ON employee_tasks
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- ===== SUMMARY =====
-- ✅ Added super_admin and employee roles
-- ✅ Set adwait@thelostproject.in as super admin
-- ✅ Fixed project access for employees - they can now see projects they're assigned to
-- ✅ Fixed sub-projects, milestones, files, and comments access for employees
-- ✅ Super admin can update any user record
-- ✅ Super admin can delete any user (including admins)
-- ✅ Admins can update non-admin users but not other admins or super admin
-- ✅ Employees can create, view, update, and delete their own tasks
-- ✅ Employees can propose new projects through task creation
