-- Threaded replies: add parent_id to project_comments
alter table if exists project_comments
  add column if not exists parent_id uuid references project_comments(id) on delete cascade;

create index if not exists idx_project_comments_parent_id
  on project_comments(parent_id);
