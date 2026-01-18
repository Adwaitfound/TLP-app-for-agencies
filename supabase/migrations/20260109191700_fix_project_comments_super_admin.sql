-- Add super_admin to project_comments and comment_replies RLS policies
-- This fixes the "Error fetching project comments" issue for super_admin users

-- Update project_comments SELECT policy to include super_admin
DROP POLICY IF EXISTS "Project comments view" ON public.project_comments;
CREATE POLICY "Project comments view" ON public.project_comments
    FOR SELECT
    USING (
        -- Admin, PM, agency_admin, super_admin can view all comments
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR
        -- Employees can view comments only for projects they are assigned to
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR
        -- Clients can view comments on their own projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    );

-- Update project_comments INSERT policy to include super_admin
DROP POLICY IF EXISTS "Project comments insert" ON public.project_comments;
CREATE POLICY "Project comments insert" ON public.project_comments
    FOR INSERT
    WITH CHECK (
        -- Admin, PM, agency_admin, super_admin can comment on any project
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
        OR
        -- Employees can comment on projects they are assigned to
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR
        -- Clients can comment on their own projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    );

-- Update comment_replies SELECT policy to include super_admin (only if table exists)
DO $$
BEGIN
    IF to_regclass('public.comment_replies') IS NOT NULL THEN
        DROP POLICY IF EXISTS "View comment replies - team and clients" ON public.comment_replies;
        CREATE POLICY "View comment replies - team and clients" ON public.comment_replies
            FOR SELECT
            USING (
                (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin', 'super_admin')
                OR (
                    (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
                    AND auth.uid() IN (
                        SELECT user_id FROM public.project_team pt
                        WHERE pt.project_id IN (
                            SELECT pc.project_id FROM public.project_comments pc
                            WHERE pc.id = comment_id
                        )
                    )
                )
                OR (
                    (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
                    AND auth.uid() IN (
                        SELECT c.user_id FROM public.clients c
                        WHERE c.id IN (
                            SELECT p.client_id FROM public.projects p
                            WHERE p.id IN (
                                SELECT pc.project_id FROM public.project_comments pc
                                WHERE pc.id = comment_id
                            )
                        )
                    )
                )
            );
    END IF;
END $$;
