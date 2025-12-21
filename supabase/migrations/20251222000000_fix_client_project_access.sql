-- Ensure clients can view their own client + projects via RLS
-- This migration is safe to re-run (drops/recreates policies).

-- CLIENTS
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Clients can view own client record" ON clients;
DROP POLICY IF EXISTS "Admins and PMs can view all clients" ON clients;

CREATE POLICY "Admins and PMs can view all clients" ON clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'project_manager')
    )
  );

CREATE POLICY "Clients can view own client record" ON clients
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND clients.user_id = auth.uid()
  );

-- PROJECTS
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Clients can view own projects" ON projects;

CREATE POLICY "Users can view assigned projects" ON projects
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      -- Admins and PMs see all
      EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'project_manager')
      )
      OR
      -- Creator sees their projects
      projects.created_by = auth.uid()
      OR
      -- Employees/team members see projects assigned to them
      EXISTS (
        SELECT 1
        FROM project_team pt
        WHERE pt.project_id = projects.id
          AND pt.user_id = auth.uid()
      )
      OR
      -- Clients see projects linked to their client record
      EXISTS (
        SELECT 1
        FROM clients c
        WHERE c.id = projects.client_id
          AND c.user_id = auth.uid()
      )
    )
  );

-- Optional hardening (commented): ensure clients.user_id is always set
-- ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
