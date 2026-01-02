-- Add agency scoping columns and lenient RLS to preserve existing data
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Add agency_id columns (nullable to avoid breaking legacy data)
alter table if exists clients add column if not exists agency_id uuid references agencies (id);
alter table if exists projects add column if not exists agency_id uuid references agencies (id);
alter table if exists project_files add column if not exists agency_id uuid references agencies (id);
alter table if exists project_comments add column if not exists agency_id uuid references agencies (id);
alter table if exists invoices add column if not exists agency_id uuid references agencies (id);
alter table if exists invoice_items add column if not exists agency_id uuid references agencies (id);
alter table if exists milestones add column if not exists agency_id uuid references agencies (id);

create index if not exists idx_clients_agency on clients (agency_id);
create index if not exists idx_projects_agency on projects (agency_id);
create index if not exists idx_project_files_agency on project_files (agency_id);
create index if not exists idx_project_comments_agency on project_comments (agency_id);
create index if not exists idx_invoices_agency on invoices (agency_id);
create index if not exists idx_invoice_items_agency on invoice_items (agency_id);
create index if not exists idx_milestones_agency on milestones (agency_id);

-- Enable RLS (if not already)
alter table if exists clients enable row level security;
alter table if exists projects enable row level security;
alter table if exists project_files enable row level security;
alter table if exists project_comments enable row level security;
alter table if exists invoices enable row level security;
alter table if exists invoice_items enable row level security;
alter table if exists milestones enable row level security;

-- Lenient policies: allow legacy rows (agency_id is null) and agency membership rows; service role always allowed

create or replace function public.agency_accessible(agid uuid) returns boolean as $$
begin
  return agid is null or agid in (select agency_id from user_agencies where user_id = auth.uid());
end;$$ language plpgsql security definer;

-- Helper to avoid duplicate policies
create or replace function public.create_rls_policy_if_not_exists(
  p_name text,
  p_table text,
  p_cmd text,
  p_using text,
  p_check text default null
) returns void as $$
declare
  v_using text := '';
  v_check text := '';
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = p_table
      and policyname = p_name
  ) then
    if lower(p_cmd) <> 'insert' and p_using is not null then
      v_using := format(' using (%s)', p_using);
    end if;

    if p_check is not null then
      v_check := format(' with check (%s)', p_check);
    end if;

    execute format(
      'create policy %I on %I.%I for %s%s%s',
      p_name,
      'public',
      p_table,
      p_cmd,
      v_using,
      v_check
    );
  end if;
end;
$$ language plpgsql security definer;

-- Clients
select public.create_rls_policy_if_not_exists('clients_service_role_all', 'clients', 'all', 'auth.role() = ''service_role''', 'auth.role() = ''service_role''');
select public.create_rls_policy_if_not_exists('clients_select_agency', 'clients', 'select', 'public.agency_accessible(agency_id)', null);
select public.create_rls_policy_if_not_exists('clients_mod_agency', 'clients', 'insert', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');
select public.create_rls_policy_if_not_exists('clients_update_agency', 'clients', 'update', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');

-- Projects
select public.create_rls_policy_if_not_exists('projects_service_role_all', 'projects', 'all', 'auth.role() = ''service_role''', 'auth.role() = ''service_role''');
select public.create_rls_policy_if_not_exists('projects_select_agency', 'projects', 'select', 'public.agency_accessible(agency_id)', null);
select public.create_rls_policy_if_not_exists('projects_mod_agency', 'projects', 'insert', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');
select public.create_rls_policy_if_not_exists('projects_update_agency', 'projects', 'update', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');

-- Project files
select public.create_rls_policy_if_not_exists('project_files_service_role_all', 'project_files', 'all', 'auth.role() = ''service_role''', 'auth.role() = ''service_role''');
select public.create_rls_policy_if_not_exists('project_files_select_agency', 'project_files', 'select', 'public.agency_accessible(agency_id)', null);
select public.create_rls_policy_if_not_exists('project_files_mod_agency', 'project_files', 'insert', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');
select public.create_rls_policy_if_not_exists('project_files_update_agency', 'project_files', 'update', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');

-- Project comments
select public.create_rls_policy_if_not_exists('project_comments_service_role_all', 'project_comments', 'all', 'auth.role() = ''service_role''', 'auth.role() = ''service_role''');
select public.create_rls_policy_if_not_exists('project_comments_select_agency', 'project_comments', 'select', 'public.agency_accessible(agency_id)', null);
select public.create_rls_policy_if_not_exists('project_comments_mod_agency', 'project_comments', 'insert', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');
select public.create_rls_policy_if_not_exists('project_comments_update_agency', 'project_comments', 'update', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');

-- Invoices
select public.create_rls_policy_if_not_exists('invoices_service_role_all', 'invoices', 'all', 'auth.role() = ''service_role''', 'auth.role() = ''service_role''');
select public.create_rls_policy_if_not_exists('invoices_select_agency', 'invoices', 'select', 'public.agency_accessible(agency_id)', null);
select public.create_rls_policy_if_not_exists('invoices_mod_agency', 'invoices', 'insert', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');
select public.create_rls_policy_if_not_exists('invoices_update_agency', 'invoices', 'update', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');

-- Invoice items
select public.create_rls_policy_if_not_exists('invoice_items_service_role_all', 'invoice_items', 'all', 'auth.role() = ''service_role''', 'auth.role() = ''service_role''');
select public.create_rls_policy_if_not_exists('invoice_items_select_agency', 'invoice_items', 'select', 'public.agency_accessible(agency_id)', null);
select public.create_rls_policy_if_not_exists('invoice_items_mod_agency', 'invoice_items', 'insert', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');
select public.create_rls_policy_if_not_exists('invoice_items_update_agency', 'invoice_items', 'update', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');

-- Milestones
select public.create_rls_policy_if_not_exists('milestones_service_role_all', 'milestones', 'all', 'auth.role() = ''service_role''', 'auth.role() = ''service_role''');
select public.create_rls_policy_if_not_exists('milestones_select_agency', 'milestones', 'select', 'public.agency_accessible(agency_id)', null);
select public.create_rls_policy_if_not_exists('milestones_mod_agency', 'milestones', 'insert', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');
select public.create_rls_policy_if_not_exists('milestones_update_agency', 'milestones', 'update', 'public.agency_accessible(agency_id)', 'public.agency_accessible(agency_id)');
