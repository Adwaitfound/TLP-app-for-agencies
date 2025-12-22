-- Allow employees and project owners to read their project_team rows
-- Needed for membership checks when loading project detail

alter table if exists project_team enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_project_team_select'
  ) THEN
    CREATE POLICY employee_project_team_select ON project_team FOR SELECT
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_team.project_id
          AND p.created_by = auth.uid()
      )
    );
  END IF;
END$$;
