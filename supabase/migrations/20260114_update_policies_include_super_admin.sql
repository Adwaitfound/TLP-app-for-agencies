-- After 'super_admin' enum value exists, update policies to include it

-- Projects policies
DROP POLICY IF EXISTS "Allow users to view projects" ON projects;
CREATE POLICY "Allow users to view projects" ON projects
    FOR SELECT
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','admin','project_manager')
        OR EXISTS (
            SELECT 1 FROM project_team 
            WHERE project_team.project_id = projects.id 
            AND project_team.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = projects.client_id 
            AND clients.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow authorized users to insert projects" ON projects;
CREATE POLICY "Allow authorized users to insert projects" ON projects
    FOR INSERT
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','admin','project_manager'));

DROP POLICY IF EXISTS "Allow authorized users to update projects" ON projects;
CREATE POLICY "Allow authorized users to update projects" ON projects
    FOR UPDATE
    USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','admin','project_manager'))
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','admin','project_manager'));

DROP POLICY IF EXISTS "Allow authorized users to delete projects" ON projects;
CREATE POLICY "Allow authorized users to delete projects" ON projects
    FOR DELETE
    USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','admin','project_manager'));
-- Users policies: allow super_admin to update and delete any user

DROP POLICY IF EXISTS "Allow users to update own record" ON users;
CREATE POLICY "Allow users to update own record" ON users
    FOR UPDATE
    USING (
        auth.uid() = id
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
        OR (
            (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
            AND (SELECT role FROM users WHERE users.id = id) <> 'admin'
        )
    );

DROP POLICY IF EXISTS "Allow super admin to delete users" ON users;
CREATE POLICY "Allow super admin to delete users" ON users
    FOR DELETE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    );