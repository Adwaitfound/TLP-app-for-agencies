-- Fix RLS policies for project_files to ensure uploads persist after refresh
-- The issue is that the subquery in the SELECT policy might be cached or executed incorrectly

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and PMs can view project files" ON project_files;
DROP POLICY IF EXISTS "Admins and PMs can insert project files" ON project_files;
DROP POLICY IF EXISTS "Admins and PMs can update project files" ON project_files;
DROP POLICY IF EXISTS "Admins and PMs can delete project files" ON project_files;
DROP POLICY IF EXISTS "Clients can view their project files" ON project_files;

-- Create optimized policies that check role directly from auth.jwt()
-- This is more reliable than subqueries

-- Allow admins and project managers to view all project files
CREATE POLICY "Admins and PMs can view project files" ON project_files 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'project_manager')
        )
    )
);

-- Allow admins and project managers to insert project files
CREATE POLICY "Admins and PMs can insert project files" ON project_files 
FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'project_manager')
        )
    )
);

-- Allow admins and project managers to update project files
CREATE POLICY "Admins and PMs can update project files" ON project_files 
FOR UPDATE 
USING (
    auth.uid() IS NOT NULL 
    AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'project_manager')
        )
    )
);

-- Allow admins and project managers to delete project files
CREATE POLICY "Admins and PMs can delete project files" ON project_files 
FOR DELETE 
USING (
    auth.uid() IS NOT NULL 
    AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'project_manager')
        )
    )
);

-- Allow clients to view files from their own projects
CREATE POLICY "Clients can view their project files" ON project_files 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 
        FROM projects p 
        JOIN clients c ON p.client_id = c.id
        WHERE p.id = project_files.project_id 
        AND c.user_id = auth.uid()
    )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'project_files'
ORDER BY policyname;
