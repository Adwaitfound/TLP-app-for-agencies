-- Super Admin RLS Policy Fix
-- This migration updates all RLS policies to grant super_admin the same access as admin

-- ============================================
-- PROJECT FILES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Allow admins and project managers to view project files" ON project_files;
CREATE POLICY "Allow admins, super admins and project managers to view project files"
    ON project_files FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Allow admins and project managers to insert project files" ON project_files;
CREATE POLICY "Allow admins, super admins and project managers to insert project files"
    ON project_files FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Allow admins and project managers to update project files" ON project_files;
CREATE POLICY "Allow admins, super admins and project managers to update project files"
    ON project_files FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Allow admins and project managers to delete project files" ON project_files;
CREATE POLICY "Allow admins, super admins and project managers to delete project files"
    ON project_files FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'project_manager')
        )
    );

-- ============================================
-- PROJECT TEAM POLICIES
-- ============================================
DROP POLICY IF EXISTS "Allow admins to manage project team" ON project_team;
CREATE POLICY "Allow admins and super admins to manage project team"
    ON project_team FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        )
    );

-- ============================================
-- TIME ENTRIES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;
CREATE POLICY "Admins and super admins can view all time entries" ON time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update all time entries" ON time_entries;
CREATE POLICY "Admins and super admins can update all time entries" ON time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================
-- LEAVE REQUESTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;
CREATE POLICY "Admins and super admins can view all leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update all leave requests" ON leave_requests;
CREATE POLICY "Admins and super admins can update all leave requests" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================
-- LEAVE BALANCE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all leave balances" ON leave_balance;
CREATE POLICY "Admins and super admins can manage all leave balances" ON leave_balance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================
-- EMPLOYEE TASKS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can view all tasks" ON employee_tasks;
CREATE POLICY "Admins and super admins can view all tasks" ON employee_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================
-- SALARY RECORDS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can manage all salary records" ON salary_records;
CREATE POLICY "Admins and super admins can manage all salary records" ON salary_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================
-- PROJECTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins and PMs can view projects" ON projects;
CREATE POLICY "Admins, super admins and PMs can view projects" ON projects
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'project_manager'))
    );

DROP POLICY IF EXISTS "Admins and PMs can insert projects" ON projects;
CREATE POLICY "Admins, super admins and PMs can insert projects" ON projects
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'project_manager'))
    );

DROP POLICY IF EXISTS "Admins and PMs can update projects" ON projects;
CREATE POLICY "Admins, super admins and PMs can update projects" ON projects
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'project_manager'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin', 'project_manager'))
    );

-- ============================================
-- ADVERTISEMENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can manage advertisements" ON advertisements;
CREATE POLICY "Admins and super admins can manage advertisements" ON advertisements
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Only admins can view ad analytics" ON ad_analytics;
CREATE POLICY "Only admins and super admins can view ad analytics" ON ad_analytics
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Only admins can manage ad targets" ON ad_targets;
CREATE POLICY "Only admins and super admins can manage ad targets" ON ad_targets
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    );

-- ============================================
-- VENDOR POLICIES
-- ============================================
DROP POLICY IF EXISTS "Allow admins to manage vendors" ON vendors;
CREATE POLICY "Allow admins and super admins to manage vendors" ON vendors
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Allow admins to manage vendor payments" ON vendor_payments;
CREATE POLICY "Allow admins and super admins to manage vendor payments" ON vendor_payments
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Allow admins to manage vendor project assignments" ON vendor_project_assignments;
CREATE POLICY "Allow admins and super admins to manage vendor project assignments" ON vendor_project_assignments
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'super_admin'))
    );

-- ============================================
-- INVOICES POLICIES
-- ============================================
-- Note: Invoices have email-based restrictions in separate migration files (INVOICES_FIX.sql)
-- Invoices access is restricted to specific admin emails for security
-- These policies are managed separately and not changed here

-- ============================================
-- PROJECT COMMENTS POLICIES
-- ============================================
-- Update comment_replies SELECT policy to include super_admin
DROP POLICY IF EXISTS "View comment replies - team and clients" ON public.comment_replies;
CREATE POLICY "View comment replies - team and clients" ON public.comment_replies
    FOR SELECT
    USING (
        -- Admin, PM, agency_admin, super_admin can view all
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR
        -- Employees can view replies for projects they are assigned to
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_id
                )
            )
        )
        OR
        -- Clients can view replies on their projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_id
                    )
                )
            )
        )
    );

-- Update project_comments SELECT policy to include super_admin
DROP POLICY IF EXISTS "Project comments view" ON public.project_comments;
CREATE POLICY "Project comments view" ON public.project_comments
    FOR SELECT
    USING (
        -- Admin, PM, agency_admin, super_admin can view all comments
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR
        -- Employees can view comments only for projects they are assigned to
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR
        -- Clients can view comments on their own projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    );

-- Update project_comments INSERT policy to include super_admin
DROP POLICY IF EXISTS "Project comments insert" ON public.project_comments;
CREATE POLICY "Project comments insert" ON public.project_comments
    FOR INSERT
    WITH CHECK (
        -- Admin, PM, agency_admin, super_admin can comment on any project
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR
        -- Employees can comment on projects they are assigned to
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR
        -- Clients can comment on their own projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    );

-- Update comment_replies INSERT policy to include super_admin
DROP POLICY IF EXISTS "Comment replies insert" ON public.comment_replies;
CREATE POLICY "Comment replies insert" ON public.comment_replies
    FOR INSERT
    WITH CHECK (
        -- Admin, PM, agency_admin, super_admin can reply anywhere
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR
        -- Employees can reply on comments for projects they are assigned to
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_replies.comment_id
                )
            )
        )
        OR
        -- Clients can reply on their own projects' comments
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_replies.comment_id
                    )
                )
            )
        )
    );

-- Update comment_replies UPDATE policy to include super_admin
DROP POLICY IF EXISTS "Comment replies update" ON public.comment_replies;
CREATE POLICY "Comment replies update" ON public.comment_replies
    FOR UPDATE
    USING (
        -- Admin, PM, agency_admin, super_admin can update any reply
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR
        -- Employees can update replies they authored on assigned projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_replies.comment_id
                )
            )
        )
        OR
        -- Clients can update replies they authored on their own projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_replies.comment_id
                    )
                )
            )
        )
    )
    WITH CHECK (
        -- Same check as USING to ensure row remains in scope after update
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_replies.comment_id
                )
            )
        )
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_replies.comment_id
                    )
                )
            )
        )
    );

-- Update comment_replies DELETE policy to include super_admin
DROP POLICY IF EXISTS "Comment replies delete" ON public.comment_replies;
CREATE POLICY "Comment replies delete" ON public.comment_replies
    FOR DELETE
    USING (
        -- Admin, PM, agency_admin, super_admin can delete any reply
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR
        -- Employees can delete replies they authored on assigned projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_replies.comment_id
                )
            )
        )
        OR
        -- Clients can delete replies they authored on their own projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_replies.comment_id
                    )
                )
            )
        )
    );

-- Update project_comments UPDATE policy to include super_admin
DROP POLICY IF EXISTS "Project comments update" ON public.project_comments;
CREATE POLICY "Project comments update" ON public.project_comments
    FOR UPDATE
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    )
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    );

-- Update project_comments DELETE policy to include super_admin
DROP POLICY IF EXISTS "Project comments delete" ON public.project_comments;
CREATE POLICY "Project comments delete" ON public.project_comments
    FOR DELETE
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    );

-- ============================================
-- COMMENT REPLIES POLICIES
-- ============================================
-- Note: Updated above along with project_comments

-- ============================================
-- CLIENT SERVICES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins can manage client services" ON client_services;
CREATE POLICY "Admins and super admins can manage client services" ON client_services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );
