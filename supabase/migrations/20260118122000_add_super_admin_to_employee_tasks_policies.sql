-- Add super_admin to employee_tasks policies after enum has been committed

DO $$ BEGIN
  -- Update SELECT policy
  DROP POLICY IF EXISTS "Allow employees to view their own tasks" ON employee_tasks;
  CREATE POLICY "Allow employees to view their own tasks" ON employee_tasks
    FOR SELECT
    USING (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'super_admin')
    );

  -- Update INSERT policy
  DROP POLICY IF EXISTS "Allow employees to create tasks" ON employee_tasks;
  CREATE POLICY "Allow employees to create tasks" ON employee_tasks
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'super_admin')
    );

  -- Update UPDATE policy
  DROP POLICY IF EXISTS "Allow employees to update their own tasks" ON employee_tasks;
  CREATE POLICY "Allow employees to update their own tasks" ON employee_tasks
    FOR UPDATE
    USING (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'super_admin')
    );

  -- Update DELETE policy
  DROP POLICY IF EXISTS "Allow employees to delete their own tasks" ON employee_tasks;
  CREATE POLICY "Allow employees to delete their own tasks" ON employee_tasks
    FOR DELETE
    USING (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'super_admin')
    );
END $$;
