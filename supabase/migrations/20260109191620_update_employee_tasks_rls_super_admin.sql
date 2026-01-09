-- Fix employee_tasks RLS policies to include super_admin role
-- This updates the existing policies created in 20260107

-- Drop and recreate SELECT policy to include super_admin
DROP POLICY IF EXISTS "Allow employees to view their own tasks" ON employee_tasks;
CREATE POLICY "Allow employees to view their own tasks" ON employee_tasks
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'super_admin')
    );

-- Drop and recreate INSERT policy to include super_admin
DROP POLICY IF EXISTS "Allow employees to create tasks" ON employee_tasks;
CREATE POLICY "Allow employees to create tasks" ON employee_tasks
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'super_admin')
    );

-- Drop and recreate UPDATE policy to include super_admin
DROP POLICY IF EXISTS "Allow employees to update their own tasks" ON employee_tasks;
CREATE POLICY "Allow employees to update their own tasks" ON employee_tasks
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'super_admin')
    );

-- Drop and recreate DELETE policy to include super_admin
DROP POLICY IF EXISTS "Allow employees to delete their own tasks" ON employee_tasks;
CREATE POLICY "Allow employees to delete their own tasks" ON employee_tasks
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'super_admin')
    );
