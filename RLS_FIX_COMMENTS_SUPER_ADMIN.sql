-- =====================================================
-- RLS FIX: Add super_admin to project_comments & comment_replies
-- Apply via Supabase Dashboard SQL Editor
-- =====================================================

-- project_comments SELECT policy
DROP POLICY IF EXISTS "Project comments view" ON public.project_comments;
CREATE POLICY "Project comments view" ON public.project_comments
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin','project_manager','agency_admin','super_admin')
    OR ((SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
        AND auth.uid() IN (SELECT user_id FROM public.project_team pt WHERE pt.project_id = project_comments.project_id))
    OR ((SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
        AND auth.uid() IN (
          SELECT c.user_id FROM public.clients c
          WHERE c.id = (SELECT client_id FROM public.projects p WHERE p.id = project_comments.project_id)
        ))
  );

-- project_comments INSERT policy
DROP POLICY IF EXISTS "Project comments insert" ON public.project_comments;
CREATE POLICY "Project comments insert" ON public.project_comments
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin','project_manager','agency_admin','super_admin')
    OR ((SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
        AND auth.uid() IN (SELECT user_id FROM public.project_team pt WHERE pt.project_id = project_comments.project_id))
    OR ((SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
        AND auth.uid() IN (
          SELECT c.user_id FROM public.clients c
          WHERE c.id = (SELECT client_id FROM public.projects p WHERE p.id = project_comments.project_id)
        ))
  );

-- comment_replies SELECT policy
DROP POLICY IF EXISTS "View comment replies - team and clients" ON public.comment_replies;
CREATE POLICY "View comment replies - team and clients" ON public.comment_replies
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin','project_manager','agency_admin','super_admin')
    OR ((SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
        AND auth.uid() IN (
          SELECT user_id FROM public.project_team pt
          WHERE pt.project_id IN (SELECT pc.project_id FROM public.project_comments pc WHERE pc.id = comment_id)
        ))
    OR ((SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
        AND auth.uid() IN (
          SELECT c.user_id FROM public.clients c
          WHERE c.id IN (
            SELECT p.client_id FROM public.projects p
            WHERE p.id IN (SELECT pc.project_id FROM public.project_comments pc WHERE pc.id = comment_id)
          )
        ))
  );
