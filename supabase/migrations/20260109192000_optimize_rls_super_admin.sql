-- =====================================================
-- OPTIMIZED RLS: Add super_admin + Performance improvements
-- Fixed version - function in public schema
-- Apply via Supabase Dashboard SQL Editor
-- =====================================================

-- Create helper function to get current user's role (cached per transaction)
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Optimized project_comments SELECT policy
DROP POLICY IF EXISTS "Project comments view" ON public.project_comments;
CREATE POLICY "Project comments view" ON public.project_comments
  FOR SELECT
  USING (
    public.user_role() IN ('admin','project_manager','agency_admin','super_admin')
    OR (public.user_role() = 'employee'
        AND EXISTS (
          SELECT 1 FROM public.project_team pt 
          WHERE pt.project_id = project_comments.project_id 
          AND pt.user_id = auth.uid()
        ))
    OR (public.user_role() = 'client'
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
    public.user_role() IN ('admin','project_manager','agency_admin','super_admin')
    OR (public.user_role() = 'employee'
        AND EXISTS (
          SELECT 1 FROM public.project_team pt 
          WHERE pt.project_id = project_comments.project_id 
          AND pt.user_id = auth.uid()
        ))
    OR (public.user_role() = 'client'
        AND EXISTS (
          SELECT 1 FROM public.clients c
          JOIN public.projects p ON p.client_id = c.id
          WHERE p.id = project_comments.project_id
          AND c.user_id = auth.uid()
        ))
  );

DO $$
BEGIN
  IF to_regclass('public.comment_replies') IS NOT NULL THEN
    DROP POLICY IF EXISTS "View comment replies - team and clients" ON public.comment_replies;
    CREATE POLICY "View comment replies - team and clients" ON public.comment_replies
      FOR SELECT
      USING (
        public.user_role() IN ('admin','project_manager','agency_admin','super_admin')
        OR (public.user_role() = 'employee'
            AND EXISTS (
              SELECT 1 FROM public.project_team pt
              JOIN public.project_comments pc ON pc.project_id = pt.project_id
              WHERE pc.id = comment_replies.comment_id
              AND pt.user_id = auth.uid()
            ))
        OR (public.user_role() = 'client'
            AND EXISTS (
              SELECT 1 FROM public.clients c
              JOIN public.projects p ON p.client_id = c.id
              JOIN public.project_comments pc ON pc.project_id = p.id
              WHERE pc.id = comment_replies.comment_id
              AND c.user_id = auth.uid()
            ))
      );
  END IF;
END $$;
