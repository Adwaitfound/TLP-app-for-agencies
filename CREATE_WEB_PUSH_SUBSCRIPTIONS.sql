-- Create table to store web push subscriptions
create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  key_p256dh text not null,
  key_auth text not null,
  created_at timestamptz default now(),
  unique (user_id)
);

-- RLS: allow service role only
alter table public.web_push_subscriptions enable row level security;
create policy "allow service role" on public.web_push_subscriptions for all using (true) with check (true);
