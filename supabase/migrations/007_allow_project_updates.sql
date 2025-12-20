-- Allow admins and project managers to update projects (for drive folder updates, etc.)
CREATE POLICY "Admins and PMs can update projects" ON projects
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );
