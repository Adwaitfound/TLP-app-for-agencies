-- Create project_comments table
create table if not exists project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_user_id uuid references users(id) on delete set null,
  text text,
  voice_url text,
  assigned_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Add columns if they don't exist
alter table if exists project_comments add column if not exists author_user_id uuid references users(id) on delete set null;
alter table if exists project_comments add column if not exists text text;
alter table if exists project_comments add column if not exists voice_url text;
alter table if exists project_comments add column if not exists assigned_user_id uuid references users(id) on delete set null;
alter table if exists project_comments add column if not exists created_at timestamptz default now();

-- Indexes
create index if not exists idx_project_comments_project_id on project_comments(project_id);
create index if not exists idx_project_comments_author_user_id on project_comments(author_user_id);

-- RLS
alter table if exists project_comments enable row level security;

-- Policies - drop if exist to recreate
drop policy if exists "Read comments for project stakeholders" on project_comments;
drop policy if exists "Insert comments by client or team" on project_comments;
drop policy if exists "Update comments by author or admin" on project_comments;
drop policy if exists "Delete comments by author or admin" on project_comments;

-- Allow read to project stakeholders (client, team, admin)
create policy "Read comments for project stakeholders" on project_comments
  for select
  using (
    -- Admins can read everything
    (EXISTS (select 1 from users u where u.id = auth.uid() and u.role = 'admin'))
    OR
    -- Employees/PMs can read when they are on the project team
    (EXISTS (
      select 1 from project_team pt
      where pt.project_id = project_comments.project_id and pt.user_id = auth.uid()
    ))
    OR
    -- Clients can read when the project belongs to their client record
    (EXISTS (
      select 1 from projects p
      join clients c on p.client_id = c.id
      where p.id = project_comments.project_id and c.user_id = auth.uid()
    ))
  );

-- Allow insert by clients (owner) and employees on the project team
create policy "Insert comments by client or team" on project_comments
  for insert
  to authenticated
  with check (
    (EXISTS (
      select 1 from projects p
      join clients c on p.client_id = c.id
      where p.id = project_comments.project_id and c.user_id = auth.uid()
    ))
    OR
    (EXISTS (
      select 1 from project_team pt
      where pt.project_id = project_comments.project_id and pt.user_id = auth.uid()
    ))
  );

-- Allow update of assigned_user_id by admins only
drop policy if exists "Admin can assign comment" on project_comments;
create policy "Admin can assign comment" on project_comments
  for update
  using (EXISTS (select 1 from users u where u.id = auth.uid() and u.role = 'admin'))
  with check (true);
