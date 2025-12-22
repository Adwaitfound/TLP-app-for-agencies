-- TEMPORARY: Fallback read policy so authenticated users can read projects
-- This alleviates visibility issues after tightened RLS. Remove once team- and role-based
-- access is fully validated in production.

ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'projects_fallback_read'
  ) THEN
    CREATE POLICY projects_fallback_read ON projects FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;
