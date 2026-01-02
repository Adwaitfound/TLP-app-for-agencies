-- Agencies and memberships
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'standard' check (plan in ('standard','premium','enterprise')),
  ads_enabled boolean not null default false,
  is_main boolean not null default false,
  website text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists user_agencies (
  user_id uuid not null references auth.users (id) on delete cascade,
  agency_id uuid not null references agencies (id) on delete cascade,
  role text not null default 'agency_admin',
  created_at timestamptz not null default now(),
  primary key (user_id, agency_id)
);

create index if not exists idx_agencies_plan on agencies (plan);
create index if not exists idx_agencies_is_main on agencies (is_main);
create index if not exists idx_user_agencies_user on user_agencies (user_id);
create index if not exists idx_user_agencies_agency on user_agencies (agency_id);

alter table agencies enable row level security;
alter table user_agencies enable row level security;

-- Service role full access (conditional to avoid duplicate errors)
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'service_role_agencies_all' and tablename = 'agencies'
  ) then
    create policy service_role_agencies_all on agencies
      for all using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'service_role_user_agencies_all' and tablename = 'user_agencies'
  ) then
    create policy service_role_user_agencies_all on user_agencies
      for all using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- User access scoped by membership (conditional)
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'agencies_select_by_membership' and tablename = 'agencies'
  ) then
    create policy agencies_select_by_membership on agencies
      for select using (id in (select agency_id from user_agencies where user_id = auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'user_agencies_select_self' and tablename = 'user_agencies'
  ) then
    create policy user_agencies_select_self on user_agencies
      for select using (user_id = auth.uid());
  end if;
end $$;
