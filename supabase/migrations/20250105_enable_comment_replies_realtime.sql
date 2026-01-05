-- Add real-time subscriptions capability for comment_replies
-- This allows clients to subscribe to real-time updates when new replies are added

ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_replies;

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_created ON public.comment_replies(comment_id, created_at DESC);

-- Enable realtime broadcasts for monitoring
ALTER TABLE public.comment_replies REPLICA IDENTITY FULL;
