-- Creates a table to capture agency onboarding requests submitted from the landing page.
-- Run in Supabase SQL editor or via migration tool.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists agency_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  agency_name text not null,
  admin_email text not null,
  admin_name text,
  website text,
  plan text not null default 'standard' check (plan in ('standard', 'premium', 'enterprise')),
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index if not exists idx_agency_onboarding_requests_email on agency_onboarding_requests (admin_email);
create index if not exists idx_agency_onboarding_requests_created_at on agency_onboarding_requests (created_at desc);

alter table agency_onboarding_requests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'service_role_full_access' and tablename = 'agency_onboarding_requests') then
    create policy service_role_full_access on agency_onboarding_requests for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end $$;
