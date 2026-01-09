-- Fix infinite recursion in project_team RLS by avoiding projects policy dependency.
-- Adds a SECURITY DEFINER helper to check client ownership without invoking projects RLS
-- and replaces the SELECT policy with a non-recursive version.

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

-- Make sure RLS is on
ALTER TABLE IF EXISTS project_team ENABLE ROW LEVEL SECURITY;

-- Remove recursive/older select policies
DROP POLICY IF EXISTS "Allow users to view project team" ON project_team;
DROP POLICY IF EXISTS project_team_select_own ON project_team;
DROP POLICY IF EXISTS employee_project_team_select ON project_team;

-- Non-recursive select policy
CREATE POLICY project_team_select_scoped ON project_team
FOR SELECT
USING (
  -- Admin-like roles see all
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
  -- Employees see their own assignments
  OR user_id = auth.uid()
  -- Clients see teams on their projects (uses definer helper to avoid recursion)
  OR can_client_access_project(project_id)
);
