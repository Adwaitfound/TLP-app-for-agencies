-- Employee access policies for project detail (team members and creators)
-- Adds select/update access for employees on projects, milestones, tasks, and files.

-- Ensure RLS is enabled
alter table if exists projects enable row level security;
alter table if exists project_team enable row level security;
alter table if exists milestones enable row level security;
alter table if exists employee_tasks enable row level security;
alter table if exists project_files enable row level security;

-- Projects: creator or project_team member can select
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_project_access'
  ) THEN
    CREATE POLICY employee_project_access ON projects FOR SELECT
    USING (
      auth.uid() = created_by
      OR EXISTS (
        SELECT 1 FROM project_team pt
        WHERE pt.project_id = projects.id
          AND pt.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Milestones: visible to creator or project_team members via parent project
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_milestone_access'
  ) THEN
    CREATE POLICY employee_milestone_access ON milestones FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_team pt
        JOIN projects p ON p.id = milestones.project_id
        WHERE pt.project_id = milestones.project_id
          AND (pt.user_id = auth.uid() OR p.created_by = auth.uid())
      )
    );
  END IF;
END$$;

-- Employee tasks: only assignee can read/update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_task_read'
  ) THEN
    CREATE POLICY employee_task_read ON employee_tasks FOR SELECT
    USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_task_update'
  ) THEN
    CREATE POLICY employee_task_update ON employee_tasks FOR UPDATE
    USING (user_id = auth.uid());
  END IF;
END$$;

-- Project files: creator or project_team member can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_project_files_access'
  ) THEN
    CREATE POLICY employee_project_files_access ON project_files FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_team pt
        JOIN projects p ON p.id = project_files.project_id
        WHERE pt.project_id = project_files.project_id
          AND (pt.user_id = auth.uid() OR p.created_by = auth.uid())
      )
    );
  END IF;
END$$;
