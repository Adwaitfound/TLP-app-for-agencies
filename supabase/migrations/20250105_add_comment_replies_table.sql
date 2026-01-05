-- Create comment_replies table for admin responses to client comments
CREATE TABLE IF NOT EXISTS public.comment_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_comment_replies_comment_id ON public.comment_replies(comment_id);
CREATE INDEX idx_comment_replies_user_id ON public.comment_replies(user_id);
CREATE INDEX idx_comment_replies_created_at ON public.comment_replies(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comment_replies
-- Allow authenticated users to read replies for their comments/projects
CREATE POLICY "Users can view comment replies for their comments" ON public.comment_replies
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.project_comments pc
            WHERE pc.id = comment_id
            UNION
            SELECT user_id FROM public.project_team pt
            WHERE pt.project_id IN (
                SELECT project_id FROM public.project_comments pc
                WHERE pc.id = comment_id
            )
            UNION
            SELECT '1'::uuid WHERE (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager')
        )
    );

-- Allow admins and project managers to insert replies
CREATE POLICY "Admins can insert comment replies" ON public.comment_replies
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- Allow admins and project managers to update their own replies
CREATE POLICY "Admins can update their own replies" ON public.comment_replies
    FOR UPDATE
    USING (
        auth.uid() = user_id AND
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    )
    WITH CHECK (
        auth.uid() = user_id AND
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );

-- Allow admins and project managers to delete their own replies
CREATE POLICY "Admins can delete their own replies" ON public.comment_replies
    FOR DELETE
    USING (
        auth.uid() = user_id AND
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'project_manager')
    );
