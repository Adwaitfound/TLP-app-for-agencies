-- Create web_push_subscriptions table
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  key_p256dh text NOT NULL,
  key_auth text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_id 
  ON public.web_push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own subscription"
  ON public.web_push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.web_push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.web_push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription"
  ON public.web_push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (for push notifications)
CREATE POLICY "Service role can read all subscriptions"
  ON public.web_push_subscriptions
  FOR SELECT
  USING (auth.role() = 'service_role');
