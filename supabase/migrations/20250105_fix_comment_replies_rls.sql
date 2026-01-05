-- Drop problematic RLS policies and recreate them with correct syntax
DROP POLICY IF EXISTS "Users can view comment replies for their comments" ON public.comment_replies;
DROP POLICY IF EXISTS "Admins can insert comment replies" ON public.comment_replies;
DROP POLICY IF EXISTS "Only admins can insert comment replies" ON public.comment_replies;
DROP POLICY IF EXISTS "Admins can update their own replies" ON public.comment_replies;
DROP POLICY IF EXISTS "Admins can delete their own replies" ON public.comment_replies;
DROP POLICY IF EXISTS "Anyone can view comment replies" ON public.comment_replies;

-- Allow viewing comment replies:
-- 1. Users who created the comment
-- 2. Project team members assigned to the project
-- 3. Admins/Project managers (can view all)
CREATE POLICY "View comment replies - owner and team" ON public.comment_replies
    FOR SELECT
    USING (
        -- Allow if user is admin or project_manager
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager')
        OR
        -- Allow if user created the original comment
        auth.uid() IN (
            SELECT user_id FROM public.project_comments pc
            WHERE pc.id = comment_id
        )
        OR
        -- Allow if user is assigned to the project team
        auth.uid() IN (
            SELECT user_id FROM public.project_team pt
            WHERE pt.project_id IN (
                SELECT project_id FROM public.project_comments pc
                WHERE pc.id = comment_id
            )
        )
    );

-- Allow only admins and project managers to insert replies
CREATE POLICY "Create comment replies - admin only" ON public.comment_replies
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- Allow admins/PMs to update their own replies, or admins to update any reply
CREATE POLICY "Update comment replies" ON public.comment_replies
    FOR UPDATE
    USING (
        auth.uid() = user_id OR
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        auth.uid() = user_id OR
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    );

-- Allow admins/PMs to delete their own replies, or admins to delete any reply
CREATE POLICY "Delete comment replies" ON public.comment_replies
    FOR DELETE
    USING (
        auth.uid() = user_id OR
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    );
