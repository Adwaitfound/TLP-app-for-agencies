-- Allow client communication via comments
-- Admins, PMs, agency_admins see all comments
-- Employees see comments only for their assigned projects
-- Clients see comments on their own projects
-- Note: super_admin is added in follow-up migration 20260106_update_policies_include_super_admin

DO $$
BEGIN
    IF to_regclass('public.comment_replies') IS NOT NULL THEN
        -- Update comment_replies SELECT policy
        DROP POLICY IF EXISTS "View comment replies - owner and team" ON public.comment_replies;
        CREATE POLICY "View comment replies - team and clients" ON public.comment_replies
    FOR SELECT
    USING (
        -- Admin, PM, agency_admin can view all
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
        OR
        -- Employees can view replies for projects they are assigned to
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_id
                )
            )
        )
        OR
        -- Clients can view replies on their projects
        (
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

-- Update project_comments SELECT policy to allow clients
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.project_comments;
CREATE POLICY "Project comments view" ON public.project_comments
    FOR SELECT
    USING (
        -- Admin, PM, agency_admin can view all comments
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
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

-- Allow inserting comments
DROP POLICY IF EXISTS "Project comments insert" ON public.project_comments;
CREATE POLICY "Project comments insert" ON public.project_comments
    FOR INSERT
    WITH CHECK (
        -- Admin, PM, agency_admin can comment on any project
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
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

-- Allow inserting replies
    DROP POLICY IF EXISTS "Comment replies insert" ON public.comment_replies;
    CREATE POLICY "Comment replies insert" ON public.comment_replies
    FOR INSERT
    WITH CHECK (
        -- Admin, PM, agency_admin can reply anywhere
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
        OR
        -- Employees can reply on comments for projects they are assigned to
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_replies.comment_id
                )
            )
        )
        OR
        -- Clients can reply on their own projects' comments
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_replies.comment_id
                    )
                )
            )
        )
    );

-- Allow updating replies
    DROP POLICY IF EXISTS "Comment replies update" ON public.comment_replies;
    CREATE POLICY "Comment replies update" ON public.comment_replies
    FOR UPDATE
    USING (
        -- Admin, PM, agency_admin can update any reply
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
        OR
        -- Employees can update replies they authored on assigned projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_replies.comment_id
                )
            )
        )
        OR
        -- Clients can update replies they authored on their own projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_replies.comment_id
                    )
                )
            )
        )
    )
    WITH CHECK (
        -- Same check as USING to ensure row remains in scope after update
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_replies.comment_id
                )
            )
        )
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_replies.comment_id
                    )
                )
            )
        )
    );

-- Allow deleting replies
    DROP POLICY IF EXISTS "Comment replies delete" ON public.comment_replies;
    CREATE POLICY "Comment replies delete" ON public.comment_replies
    FOR DELETE
    USING (
        -- Admin, PM, agency_admin can delete any reply
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
        OR
        -- Employees can delete replies they authored on assigned projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
                        AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id IN (
                    SELECT pc.project_id FROM public.project_comments pc
                    WHERE pc.id = comment_replies.comment_id
                )
            )
        )
        OR
        -- Clients can delete replies they authored on their own projects
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND comment_replies.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id IN (
                    SELECT p.client_id FROM public.projects p
                    WHERE p.id IN (
                        SELECT pc.project_id FROM public.project_comments pc
                        WHERE pc.id = comment_replies.comment_id
                    )
                )
            )
        )
    );

    END IF;
END $$;

-- Allow updating comments
DROP POLICY IF EXISTS "Project comments update" ON public.project_comments;
CREATE POLICY "Project comments update" ON public.project_comments
    FOR UPDATE
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    )
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    );

-- Allow deleting comments
DROP POLICY IF EXISTS "Project comments delete" ON public.project_comments;
CREATE POLICY "Project comments delete" ON public.project_comments
    FOR DELETE
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager', 'agency_admin')
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'employee'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT user_id FROM public.project_team pt
                WHERE pt.project_id = project_comments.project_id
            )
        )
        OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'client'
            AND project_comments.user_id = auth.uid()
            AND auth.uid() IN (
                SELECT c.user_id FROM public.clients c
                WHERE c.id = (
                    SELECT client_id FROM public.projects p
                    WHERE p.id = project_comments.project_id
                )
            )
        )
    );
