-- Fix recursive RLS between projects and project_team by simplifying team select policy

ALTER TABLE IF EXISTS project_team ENABLE ROW LEVEL SECURITY;

-- Drop the previous policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_project_team_select' AND tablename = 'project_team'
  ) THEN
    DROP POLICY employee_project_team_select ON project_team;
  END IF;
END$$;

-- Minimal non-recursive policy: a user can see only their own project_team rows
CREATE POLICY project_team_select_own ON project_team FOR SELECT
USING (user_id = auth.uid());
