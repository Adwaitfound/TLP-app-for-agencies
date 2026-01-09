-- =====================================================
-- OPTIMIZED RLS: Add super_admin + Performance improvements (Fixed)
-- Apply via psql or Supabase Dashboard SQL Editor
-- =====================================================

-- Create helper function in public schema (cached per transaction)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Add critical indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_user_id ON project_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_project_team_project_user ON project_team(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_users_id_role ON users(id, role);

-- Optimized project_comments SELECT policy
DROP POLICY IF EXISTS "Project comments view" ON public.project_comments;
CREATE POLICY "Project comments view" ON public.project_comments
  FOR SELECT
  USING (
    public.current_user_role() IN ('admin','project_manager','agency_admin','super_admin')
    OR (public.current_user_role() = 'employee'
        AND EXISTS (
          SELECT 1 FROM public.project_team pt 
          WHERE pt.project_id = project_comments.project_id 
          AND pt.user_id = auth.uid()
        ))
    OR (public.current_user_role() = 'client'
        AND EXISTS (
          SELECT 1 FROM public.clients c
          JOIN public.projects p ON p.client_id = c.id
          WHERE p.id = project_comments.project_id
          AND c.user_id = auth.uid()
        ))
  );

-- Optimized project_comments INSERT policy
DROP POLICY IF EXISTS "Project comments insert" ON public.project_comments;
CREATE POLICY "Project comments insert" ON public.project_comments
  FOR INSERT
  WITH CHECK (
    public.current_user_role() IN ('admin','project_manager','agency_admin','super_admin')
    OR (public.current_user_role() = 'employee'
        AND EXISTS (
          SELECT 1 FROM public.project_team pt 
          WHERE pt.project_id = project_comments.project_id 
          AND pt.user_id = auth.uid()
        ))
    OR (public.current_user_role() = 'client'
        AND EXISTS (
          SELECT 1 FROM public.clients c
          JOIN public.projects p ON p.client_id = c.id
          WHERE p.id = project_comments.project_id
          AND c.user_id = auth.uid()
        ))
  );

-- Optimized comment_replies SELECT policy
DROP POLICY IF EXISTS "View comment replies - team and clients" ON public.comment_replies;
CREATE POLICY "View comment replies - team and clients" ON public.comment_replies
  FOR SELECT
  USING (
    public.current_user_role() IN ('admin','project_manager','agency_admin','super_admin')
    OR (public.current_user_role() = 'employee'
        AND EXISTS (
          SELECT 1 FROM public.project_team pt
          JOIN public.project_comments pc ON pc.project_id = pt.project_id
          WHERE pc.id = comment_replies.comment_id
          AND pt.user_id = auth.uid()
        ))
    OR (public.current_user_role() = 'client'
        AND EXISTS (
          SELECT 1 FROM public.clients c
          JOIN public.projects p ON p.client_id = c.id
          JOIN public.project_comments pc ON pc.project_id = p.id
          WHERE pc.id = comment_replies.comment_id
          AND c.user_id = auth.uid()
        ))
  );

-- Add missing indexes for sub_projects (if not already present)
CREATE INDEX IF NOT EXISTS idx_sub_projects_parent_project ON sub_projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_sub_projects_assigned_to ON sub_projects(assigned_to);

-- Analyze tables to update query planner statistics
ANALYZE project_comments;
ANALYZE comment_replies;
ANALYZE project_team;
ANALYZE projects;
ANALYZE clients;
ANALYZE users;
