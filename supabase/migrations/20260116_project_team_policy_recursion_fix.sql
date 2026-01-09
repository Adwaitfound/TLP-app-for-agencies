-- Re-apply project_team select policy without projects recursion; idempotent replacement.

-- Helper: determine if current user owns the project as a client (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_client_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE p.id = p_project_id
      AND c.user_id = auth.uid()
  );
END;
$$;

ALTER TABLE IF EXISTS project_team ENABLE ROW LEVEL SECURITY;

-- Clean up prior select policies to avoid recursion
DROP POLICY IF EXISTS "Allow users to view project team" ON project_team;
DROP POLICY IF EXISTS project_team_select_own ON project_team;
DROP POLICY IF EXISTS employee_project_team_select ON project_team;
DROP POLICY IF EXISTS project_team_select_scoped ON project_team;

CREATE POLICY project_team_select_scoped ON project_team
FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
  OR user_id = auth.uid()
  OR can_client_access_project(project_id)
);
