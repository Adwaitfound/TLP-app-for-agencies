-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS project_comments CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS milestone_status CASCADE;
DROP TYPE IF EXISTS comment_status CASCADE;
DROP TYPE IF EXISTS client_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'client');
CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'in_review', 'completed', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE client_status AS ENUM ('active', 'inactive');
CREATE TYPE comment_status AS ENUM ('pending', 'resolved');
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed');

-- Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'client',
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    total_projects INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    status client_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    budget DECIMAL(15, 2),
    start_date DATE,
    deadline DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    thumbnail_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project files table
CREATE TABLE project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    version INTEGER DEFAULT 1,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project comments table
CREATE TABLE project_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES project_files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    timestamp_seconds DECIMAL(10, 2),
    status comment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    project_id UUID REFERENCES projects(id),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL,
    status invoice_status DEFAULT 'draft',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice items table
CREATE TABLE invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL
);

-- Milestones table
CREATE TABLE milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status milestone_status DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be customized based on requirements)
-- Users can read all users
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);

-- Users can update their own record
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid() = id);

-- Projects are viewable by authenticated users
CREATE POLICY "Authenticated users can view projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');

-- Similar policies for other tables
CREATE POLICY "Authenticated users can view clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view invoices" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view project files" ON project_files FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view comments" ON project_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view milestones" ON milestones FOR SELECT USING (auth.role() = 'authenticated');
-- Add INSERT policies to allow user registration

-- Allow users to insert their own user record during signup
CREATE POLICY "Users can insert own record" ON users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow users to insert client records for themselves
CREATE POLICY "Users can insert client records" ON clients 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert projects
CREATE POLICY "Authenticated users can insert projects" ON projects 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert project files
CREATE POLICY "Authenticated users can insert project files" ON project_files 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert comments
CREATE POLICY "Authenticated users can insert comments" ON project_comments 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert invoices
CREATE POLICY "Authenticated users can insert invoices" ON invoices 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert invoice items
CREATE POLICY "Authenticated users can insert invoice items" ON invoice_items 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert milestones
CREATE POLICY "Authenticated users can insert milestones" ON milestones 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
-- Fix users table INSERT policy for signup
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can insert own record" ON users;

-- Create a more permissive policy that allows signup
-- This allows inserting during signup when auth.uid() matches the id being inserted
CREATE POLICY "Allow user creation during signup" ON users 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'authenticated'
  );
-- Add unique constraint to clients table user_id
ALTER TABLE clients ADD CONSTRAINT clients_user_id_unique UNIQUE (user_id);
-- Add service type to projects
CREATE TYPE service_type AS ENUM ('social_media', 'video_production', 'design_branding');

-- Add service_type column to projects table
ALTER TABLE projects 
ADD COLUMN service_type service_type NOT NULL DEFAULT 'video_production';

-- Create a table to track which services each client uses
CREATE TABLE client_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    service_type service_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, service_type)
);

-- Create index for faster queries
CREATE INDEX idx_projects_service_type ON projects(service_type);
CREATE INDEX idx_client_services_client_id ON client_services(client_id);

-- Add RLS policies for client_services
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view client services" 
    ON client_services FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage client services" 
    ON client_services FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );
-- Add Google Drive folder link to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;

-- Drop existing table if it exists to start fresh
DROP TABLE IF EXISTS project_files CASCADE;

-- Create project_files table for tracking uploaded files and Drive links
CREATE TABLE project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'document', 'image', 'video', 'pdf', 'other'
    file_category TEXT NOT NULL, -- 'pre_production', 'production', 'post_production', 'deliverables', 'other'
    storage_type TEXT NOT NULL, -- 'supabase' or 'google_drive'
    file_url TEXT, -- Supabase storage path or Google Drive link
    file_size BIGINT, -- Size in bytes (for Supabase uploads)
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_category ON project_files(file_category);

-- Enable RLS
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_files
CREATE POLICY "Allow admins and project managers to view project files"
    ON project_files FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

CREATE POLICY "Allow admins and project managers to insert project files"
    ON project_files FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

CREATE POLICY "Allow admins and project managers to update project files"
    ON project_files FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

CREATE POLICY "Allow admins and project managers to delete project files"
    ON project_files FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

-- Allow clients to view files from their own projects
CREATE POLICY "Allow clients to view their project files"
    ON project_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = project_files.project_id
            AND c.user_id = auth.uid()
        )
    );

-- Allow admins and project managers to update projects (for drive folder updates, etc.)
CREATE POLICY "Admins and PMs can update projects" ON projects
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );
-- Create project_team table for tracking team member assignments
CREATE TABLE project_team (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT, -- Optional role like 'lead', 'editor', 'designer', etc.
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    assigned_by UUID REFERENCES users(id),
    UNIQUE(project_id, user_id)
);

-- Create indexes
CREATE INDEX idx_project_team_project_id ON project_team(project_id);
CREATE INDEX idx_project_team_user_id ON project_team(user_id);

-- Enable RLS
ALTER TABLE project_team ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all authenticated users to view project team"
    ON project_team FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage project team"
    ON project_team FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );
-- Create sub-projects table (tasks under a main project)
CREATE TABLE IF NOT EXISTS sub_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    assigned_to UUID REFERENCES users(id),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    due_date DATE,
    video_url TEXT,
    video_thumbnail_url TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sub-project comments table
CREATE TABLE IF NOT EXISTS sub_project_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sub_project_id UUID NOT NULL REFERENCES sub_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sub-project updates/activity table
CREATE TABLE IF NOT EXISTS sub_project_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sub_project_id UUID NOT NULL REFERENCES sub_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    update_text TEXT NOT NULL,
    update_type TEXT DEFAULT 'general', -- general, status_change, progress_update, etc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sub_projects_parent ON sub_projects(parent_project_id);
CREATE INDEX idx_sub_projects_assigned_to ON sub_projects(assigned_to);
CREATE INDEX idx_sub_projects_status ON sub_projects(status);
CREATE INDEX idx_sub_project_comments_sub_project_id ON sub_project_comments(sub_project_id);
CREATE INDEX idx_sub_project_updates_sub_project_id ON sub_project_updates(sub_project_id);

-- Add updated_at trigger for sub_projects
CREATE TRIGGER update_sub_projects_updated_at BEFORE UPDATE ON sub_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE sub_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_project_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view sub_projects" ON sub_projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sub_projects" ON sub_projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sub_projects" ON sub_projects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sub_projects" ON sub_projects FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view sub_project_comments" ON sub_project_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sub_project_comments" ON sub_project_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view sub_project_updates" ON sub_project_updates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sub_project_updates" ON sub_project_updates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Calendar events for content planning
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_date date not null,
  title text not null,
  copy text,
  platform text check (platform in ('instagram','facebook','youtube','linkedin')),
  content_type text check (content_type in ('reel','carousel','story','static','video')),
  status text check (status in ('idea','editing','review','scheduled','published')) default 'idea',
  ig_link text,
  yt_link text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  attachments jsonb default '[]'::jsonb
);

alter table public.calendar_events enable row level security;

-- Basic policies: owner or authenticated can read/write for their org; simplistic for now
create policy if not exists "calendar_events read" on public.calendar_events
  for select to authenticated using (true);

create policy if not exists "calendar_events insert" on public.calendar_events
  for insert to authenticated with check (true);

create policy if not exists "calendar_events update" on public.calendar_events
  for update to authenticated using (true) with check (true);

create policy if not exists "calendar_events delete" on public.calendar_events
  for delete to authenticated using (true);

-- Helpful index
create index if not exists calendar_events_project_date_idx on public.calendar_events(project_id, event_date);
-- Add new columns to invoices table for invoice upload management
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_date DATE,
ADD COLUMN IF NOT EXISTS tax_type TEXT CHECK (tax_type IN ('gst', 'non_gst', 'both')) DEFAULT 'gst',
ADD COLUMN IF NOT EXISTS invoice_file_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update the invoices table to make some fields optional since we're uploading invoices
ALTER TABLE invoices 
ALTER COLUMN project_id DROP NOT NULL,
ALTER COLUMN due_date DROP NOT NULL,
ALTER COLUMN subtotal DROP NOT NULL,
ALTER COLUMN tax DROP NOT NULL,
ALTER COLUMN total DROP NOT NULL;

-- Add comment to explain the redesign
COMMENT ON TABLE invoices IS 'Invoices table - supports both manual creation and uploaded invoices with advance payment tracking';
-- Ensure invoice uploads work with new columns
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_file_url TEXT,
ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_date DATE,
ADD COLUMN IF NOT EXISTS tax_type TEXT CHECK (tax_type IN ('gst','non_gst','both')) DEFAULT 'gst',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make project_id optional to allow uploads without a project
ALTER TABLE invoices
ALTER COLUMN project_id DROP NOT NULL;

-- Make monetary fields nullable for uploaded invoices where breakdown is not provided
ALTER TABLE invoices
ALTER COLUMN subtotal DROP NOT NULL,
ALTER COLUMN tax DROP NOT NULL,
ALTER COLUMN total DROP NOT NULL;
-- No-op migration: employee seed removed intentionally
DO $$
BEGIN
    RAISE NOTICE 'Skipping employee seed; user not created.';
END $$;
-- Restrict invoices access to a single admin email (adwait@thelostproject.in)
-- and keep service_role access for backend tasks.

-- Clean up prior broad policies
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can view invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can delete invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can update invoices" ON invoices;

-- Helper predicate
CREATE OR REPLACE FUNCTION public.is_adwait()
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'adwait@thelostproject.in';
$$;

-- Select
CREATE POLICY "Adwait can view invoices" ON invoices
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR public.is_adwait()
  );

-- Insert
CREATE POLICY "Adwait can insert invoices" ON invoices
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_adwait()
  );

-- Update
CREATE POLICY "Adwait can update invoices" ON invoices
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR public.is_adwait()
  );

-- Delete
CREATE POLICY "Adwait can delete invoices" ON invoices
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR public.is_adwait()
  );

-- Note: storage access for invoice PDFs (project-files bucket) is not enforced here.
-- If the bucket is private, add storage policies to restrict to this email as well.
-- Restrict Storage access for invoice PDFs to only adwait@thelostproject.in
-- Scope: only objects under `project-files` bucket with path prefix `invoices/`

-- Ensure bucket exists and is private
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('project-files', 'project-files', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
END $$;

-- Helper predicate to check email from JWT
CREATE OR REPLACE FUNCTION public.is_adwait()
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'adwait@thelostproject.in';
$$;

-- Clean up any prior policies with these names
DROP POLICY IF EXISTS "Adwait can read invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can upload invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can update invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can delete invoice PDFs" ON storage.objects;

-- Read
CREATE POLICY "Adwait can read invoice PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR public.is_adwait()
    )
  );

-- Insert (upload)
CREATE POLICY "Adwait can upload invoice PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR public.is_adwait()
    )
  );

-- Update (replace/metadata)
CREATE POLICY "Adwait can update invoice PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR public.is_adwait()
    )
  );

-- Delete
CREATE POLICY "Adwait can delete invoice PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR public.is_adwait()
    )
  );
-- Ensure invoices can be created without a due_date (for uploaded PDFs)
ALTER TABLE invoices
  ALTER COLUMN due_date DROP NOT NULL;

-- Also relax common monetary fields in case prior migration didn’t apply
ALTER TABLE invoices
  ALTER COLUMN subtotal DROP NOT NULL,
  ALTER COLUMN tax DROP NOT NULL,
  ALTER COLUMN total DROP NOT NULL;

-- And allow invoices without a project if not already relaxed
ALTER TABLE invoices
  ALTER COLUMN project_id DROP NOT NULL;
-- Update RLS policies to use auth.email() instead of custom JWT extraction
-- This is more reliable for client-side operations

-- Drop old function and policies
DROP FUNCTION IF EXISTS public.is_adwait() CASCADE;

DROP POLICY IF EXISTS "Adwait can view invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can update invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can delete invoices" ON invoices;

-- Recreate policies using auth.email() which is built-in and more reliable
CREATE POLICY "Adwait can view invoices" ON invoices
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );

CREATE POLICY "Adwait can insert invoices" ON invoices
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );

CREATE POLICY "Adwait can update invoices" ON invoices
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );

CREATE POLICY "Adwait can delete invoices" ON invoices
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );
-- Fix storage RLS policies to use auth.email() instead of custom JWT extraction

-- Drop old function and policies
DROP FUNCTION IF EXISTS public.is_adwait() CASCADE;

DROP POLICY IF EXISTS "Adwait can read invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can upload invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can update invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can delete invoice PDFs" ON storage.objects;

-- Recreate policies using auth.email()
CREATE POLICY "Adwait can read invoice PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
    )
  );

CREATE POLICY "Adwait can upload invoice PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
    )
  );

CREATE POLICY "Adwait can update invoice PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
    )
  );

CREATE POLICY "Adwait can delete invoice PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
    )
  );
-- Remove UNIQUE constraint from invoice_number since invoices for different clients can have the same number
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
-- Temporarily disable storage RLS to allow service role to access the bucket
-- The endpoint-level authentication (server action checking user.email) provides sufficient security

-- Drop all RLS policies on storage.objects
DROP POLICY IF EXISTS "Adwait can read invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can upload invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can update invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can delete invoice PDFs" ON storage.objects;

-- Create permissive policies that allow all authenticated users and service role
-- The actual access control is enforced at the application layer via server actions
CREATE POLICY "Allow service role and authenticated users" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'project-files'
    AND (
      auth.role() = 'service_role'
      OR auth.role() = 'authenticated'
    )
  );
-- Milestones enhancements: add blocked status, ordering, audit fields, and RLS

-- 1) Extend status enum
ALTER TYPE milestone_status ADD VALUE IF NOT EXISTS 'blocked';

-- 2) Add columns for ordering and audit
ALTER TABLE milestones
    ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by_email TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3) Backfill position in case older rows exist
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 AS rn
    FROM milestones
)
UPDATE milestones m
SET position = ranked.rn
FROM ranked
WHERE ranked.id = m.id;

-- 4) Backfill created_by_email to current admin (adjust if you onboard more users)
UPDATE milestones
SET created_by_email = 'adwait@thelostproject.in'
WHERE created_by_email IS NULL;

-- 5) Keep updated_at in sync
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON milestones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6) Enable and tighten RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Milestones select" ON milestones;
DROP POLICY IF EXISTS "Milestones insert" ON milestones;
DROP POLICY IF EXISTS "Milestones update" ON milestones;
DROP POLICY IF EXISTS "Milestones delete" ON milestones;

CREATE POLICY "Milestones select" ON milestones
FOR SELECT
USING (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
);

CREATE POLICY "Milestones insert" ON milestones
FOR INSERT
WITH CHECK (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
);

CREATE POLICY "Milestones update" ON milestones
FOR UPDATE
USING (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
)
WITH CHECK (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
);

CREATE POLICY "Milestones delete" ON milestones
FOR DELETE
USING (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
);
-- Refresh PostgREST schema cache after schema changes
-- This addresses errors like: "Could not find the 'created_by_email' column of 'milestones' in the schema cache"

-- Trigger PostgREST to reload its cached schema
NOTIFY pgrst, 'reload schema';
-- Ensure the column exists on remote (idempotent)
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS created_by_email TEXT;

-- Also refresh PostgREST schema cache in case it’s stale
NOTIFY pgrst, 'reload schema';
-- Make the project-files bucket public for simpler access
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('project-files', 'project-files', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

-- Optional: allow public SELECTs via REST (not needed for public URL access)
-- Keeps write actions protected.
DROP POLICY IF EXISTS "Public read project files" ON storage.objects;
CREATE POLICY "Public read project files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files');
-- Loosen time_entries insert/update to avoid RLS failures for authenticated users
-- while still binding rows to the current user.

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert entries tied to themselves
CREATE POLICY "Authenticated can insert time entries" ON time_entries
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own entries (any status)
CREATE POLICY "Authenticated can update own time entries" ON time_entries
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);-- Employee Time Tracking & Attendance
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    hours_worked DECIMAL(5,2),
    entry_type VARCHAR(20) DEFAULT 'work' CHECK (entry_type IN ('work', 'break', 'meeting', 'admin')),
    is_billable BOOLEAN DEFAULT true,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Management
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'personal', 'unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count DECIMAL(3,1) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Balance
CREATE TABLE IF NOT EXISTS leave_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    vacation_days DECIMAL(4,1) DEFAULT 20,
    sick_days DECIMAL(4,1) DEFAULT 10,
    personal_days DECIMAL(4,1) DEFAULT 5,
    used_vacation DECIMAL(4,1) DEFAULT 0,
    used_sick DECIMAL(4,1) DEFAULT 0,
    used_personal DECIMAL(4,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);

-- Employee Tasks
CREATE TABLE IF NOT EXISTS employee_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'completed', 'cancelled')),
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Records (optional, for future use)
CREATE TABLE IF NOT EXISTS salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL,
    bonus DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_user_status ON employee_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_due_date ON employee_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_salary_records_user_year_month ON salary_records(user_id, year DESC, month DESC);

-- RLS Policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;

-- Time Entries Policies
CREATE POLICY "Users can view own time entries" ON time_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time entries" ON time_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft time entries" ON time_entries
    FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins can view all time entries" ON time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all time entries" ON time_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Leave Requests Policies
CREATE POLICY "Users can view own leave requests" ON leave_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending leave requests" ON leave_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all leave requests" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Leave Balance Policies
CREATE POLICY "Users can view own leave balance" ON leave_balance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all leave balances" ON leave_balance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Employee Tasks Policies
CREATE POLICY "Users can manage own tasks" ON employee_tasks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tasks" ON employee_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Salary Records Policies
CREATE POLICY "Users can view own salary records" ON salary_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all salary records" ON salary_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_employee_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();

CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();

CREATE TRIGGER update_leave_balance_updated_at
    BEFORE UPDATE ON leave_balance
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();

CREATE TRIGGER update_employee_tasks_updated_at
    BEFORE UPDATE ON employee_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();

CREATE TRIGGER update_salary_records_updated_at
    BEFORE UPDATE ON salary_records
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_features_updated_at();
-- Calendar events for content planning (initial create)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_date date not null,
  title text not null,
  copy text,
  platform text check (platform in ('instagram','facebook','youtube','linkedin')),
  content_type text check (content_type in ('reel','carousel','story','static','video')),
  status text check (status in ('idea','editing','review','scheduled','published')) default 'idea',
  ig_link text,
  yt_link text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  attachments jsonb default '[]'::jsonb
);

alter table public.calendar_events enable row level security;

-- Basic policies: authenticated users allowed (adjust as needed)
drop policy if exists "calendar_events read" on public.calendar_events;
create policy "calendar_events read" on public.calendar_events
  for select to authenticated using (true);

drop policy if exists "calendar_events insert" on public.calendar_events;
create policy "calendar_events insert" on public.calendar_events
  for insert to authenticated with check (true);

drop policy if exists "calendar_events update" on public.calendar_events;
create policy "calendar_events update" on public.calendar_events
  for update to authenticated using (true) with check (true);

drop policy if exists "calendar_events delete" on public.calendar_events;
create policy "calendar_events delete" on public.calendar_events
  for delete to authenticated using (true);

-- Helpful index
create index if not exists calendar_events_project_date_idx on public.calendar_events(project_id, event_date);
-- Add copy/caption field for calendar events (idempotent)
alter table if exists public.calendar_events
  add column if not exists copy text;
-- Add 'employee' role to user_role enum
-- This must be a separate migration to avoid "unsafe use of new enum value" error
DO $$ 
BEGIN
    ALTER TYPE user_role ADD VALUE 'employee' BEFORE 'client';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;
-- Complete fix for employee role and RLS policies
-- This ensures employees can see projects they're assigned to

-- Step 1: Add 'employee' role to enum (if not already present)
DO $$ 
BEGIN
    ALTER TYPE user_role ADD VALUE 'employee' BEFORE 'client';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

-- Step 2: Fix project_team RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to view project team" ON project_team CASCADE;
DROP POLICY IF EXISTS "Allow all authenticated users to view project team" ON project_team CASCADE;
DROP POLICY IF EXISTS "Allow admins to manage project team" ON project_team CASCADE;

-- Admins and PMs can manage all
CREATE POLICY "Admins manage project team" ON project_team
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
        )
    );

-- Employees can see their own assignments
CREATE POLICY "Employees view own assignments" ON project_team
    FOR SELECT
    USING (auth.uid() = user_id);

-- Clients and other authenticated users can view
CREATE POLICY "Authenticated view project assignments" ON project_team
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Step 3: Fix projects RLS - allow employees to see projects they're assigned to
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects CASCADE;

CREATE POLICY "Users can view assigned projects" ON projects
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- Admins and project managers see all
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'project_manager')
            ) OR
            -- Users see projects they created
            created_by = auth.uid() OR
            -- Employees and team members see projects assigned to them
            EXISTS (
                SELECT 1 FROM project_team 
                WHERE project_team.project_id = projects.id 
                AND project_team.user_id = auth.uid()
            ) OR
            -- Clients see projects linked to their client record
            EXISTS (
                SELECT 1 FROM clients 
                WHERE clients.id = projects.client_id 
                AND clients.user_id = auth.uid()
            )
        )
    );

-- Step 4: Fix milestones RLS
DROP POLICY IF EXISTS "Authenticated users can view milestones" ON milestones CASCADE;

CREATE POLICY "Users can view assigned project milestones" ON milestones
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- Admins see all
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'project_manager')
            ) OR
            -- Users see milestones for projects they're assigned to
            EXISTS (
                SELECT 1 FROM project_team 
                WHERE project_team.user_id = auth.uid() 
                AND project_team.project_id = milestones.project_id
            ) OR
            -- Users see milestones for projects they created
            EXISTS (
                SELECT 1 FROM projects 
                WHERE projects.id = milestones.project_id 
                AND projects.created_by = auth.uid()
            )
        )
    );

-- Step 5: Fix project_files RLS
DROP POLICY IF EXISTS "Authenticated users can view project files" ON project_files CASCADE;

CREATE POLICY "Users can view project files" ON project_files
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'project_manager')
            ) OR
            EXISTS (
                SELECT 1 FROM project_team 
                WHERE project_team.user_id = auth.uid() 
                AND project_team.project_id = project_files.project_id
            ) OR
            EXISTS (
                SELECT 1 FROM projects 
                WHERE projects.id = project_files.project_id 
                AND projects.created_by = auth.uid()
            )
        )
    );

-- Add missing profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT;
-- Add fields to allow employees to propose a project when creating a task
ALTER TABLE employee_tasks
  ADD COLUMN IF NOT EXISTS proposed_project_name TEXT,
  ADD COLUMN IF NOT EXISTS proposed_project_status VARCHAR(20) DEFAULT 'pending' CHECK (proposed_project_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS proposed_project_notes TEXT,
  ADD COLUMN IF NOT EXISTS proposed_project_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_project_reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employee_tasks_proposed_status ON employee_tasks(proposed_project_status);
-- Fix RLS policies for employee_tasks table to allow employees to read/write their own tasks

-- Drop existing policies if any
DROP POLICY IF EXISTS "employee_tasks_select" ON employee_tasks;
DROP POLICY IF EXISTS "employee_tasks_insert" ON employee_tasks;
DROP POLICY IF EXISTS "employee_tasks_update" ON employee_tasks;
DROP POLICY IF EXISTS "employee_tasks_delete" ON employee_tasks;

-- Enable RLS
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

-- Employees can read their own tasks
CREATE POLICY "employee_tasks_select" ON employee_tasks
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    );

-- Employees can insert their own tasks
CREATE POLICY "employee_tasks_insert" ON employee_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    );

-- Employees can update their own tasks (or admin/PM can update any)
CREATE POLICY "employee_tasks_update" ON employee_tasks
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    );

-- Employees can delete their own tasks (or admin/PM can delete any)
CREATE POLICY "employee_tasks_delete" ON employee_tasks
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    );
-- Add vertical field to proposed projects for better categorization
ALTER TABLE employee_tasks
  ADD COLUMN IF NOT EXISTS proposed_project_vertical VARCHAR(50) CHECK (proposed_project_vertical IN ('video_production', 'social_media', 'design_branding'));

-- Create index for filtering by vertical
CREATE INDEX IF NOT EXISTS idx_employee_tasks_proposed_vertical ON employee_tasks(proposed_project_vertical) WHERE proposed_project_name IS NOT NULL;
-- Allow employees who are team members to upload, view, update, and delete project files

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow employees to view team project files" ON project_files;
DROP POLICY IF EXISTS "Allow employees to insert team project files" ON project_files;
DROP POLICY IF EXISTS "Allow employees to update team project files" ON project_files;
DROP POLICY IF EXISTS "Allow employees to delete team project files" ON project_files;

-- Allow employees to view files from projects they are team members of
CREATE POLICY "Allow employees to view team project files"
    ON project_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_team pt
            WHERE pt.project_id = project_files.project_id
            AND pt.user_id = auth.uid()
        )
    );

-- Allow employees to insert files to projects they are team members of
CREATE POLICY "Allow employees to insert team project files"
    ON project_files FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_team pt
            WHERE pt.project_id = project_files.project_id
            AND pt.user_id = auth.uid()
        )
    );

-- Allow employees to update files in projects they are team members of
CREATE POLICY "Allow employees to update team project files"
    ON project_files FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM project_team pt
            WHERE pt.project_id = project_files.project_id
            AND pt.user_id = auth.uid()
        )
    );

-- Allow employees to delete files they uploaded in their team projects
CREATE POLICY "Allow employees to delete team project files"
    ON project_files FOR DELETE
    USING (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM project_team pt
            WHERE pt.project_id = project_files.project_id
            AND pt.user_id = auth.uid()
        )
    );
-- Add user_status for admin approval gate
DO $$
BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'pending';

-- Approve existing users to avoid locking out current accounts
UPDATE users
SET status = 'approved'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
-- Allow admins to update any user (for approvals)
DROP POLICY IF EXISTS "Admins can update users" ON users;

CREATE POLICY "Admins can update users"
    ON users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );
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
-- Add client approval fields to projects
alter table projects add column if not exists client_approved boolean not null default false;
alter table projects add column if not exists client_approved_at timestamptz;

-- Index for quick filtering
create index if not exists idx_projects_client_approved on projects(client_approved);
-- Add assigned_user_id to project_comments for assignment workflows
alter table project_comments
    add column if not exists assigned_user_id uuid references users(id) on delete set null;

create index if not exists idx_project_comments_assigned_user_id
    on project_comments(assigned_user_id);
-- Notifications table for in-app alerts
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  message text not null,
  metadata jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_read on notifications(user_id, read);
create index if not exists idx_notifications_created on notifications(created_at desc);-- ===== VENDORS & PAYMENTS SCHEMA =====
-- Run this in Supabase SQL Editor to add vendor and payment tracking

-- Create vendor type enum
DO $$ BEGIN
    CREATE TYPE vendor_type AS ENUM (
        'videographer',
        'photographer', 
        'editor',
        'animator',
        'graphic_designer',
        'sound_engineer',
        'voice_artist',
        'equipment_rental',
        'studio_rental',
        'drone_operator',
        'makeup_artist',
        'talent',
        'location_scout',
        'production_assistant',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment frequency enum
DO $$ BEGIN
    CREATE TYPE payment_frequency AS ENUM (
        'one_time',
        'weekly',
        'monthly',
        'per_project',
        'recurring'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment status enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'scheduled',
        'processing',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    vendor_type vendor_type NOT NULL,
    phone TEXT,
    email TEXT,
    upi_id TEXT,
    bank_account_number TEXT,
    bank_ifsc_code TEXT,
    bank_account_name TEXT,
    address TEXT,
    
    -- Tracking
    total_projects_worked INTEGER DEFAULT 0,
    total_amount_paid DECIMAL(15, 2) DEFAULT 0,
    average_rating DECIMAL(3, 2), -- e.g., 4.5 out of 5
    
    -- Work frequency
    work_frequency payment_frequency,
    last_worked_date DATE,
    
    -- Notes
    notes TEXT,
    skills TEXT[], -- Array of skills/specialties
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    preferred_vendor BOOLEAN DEFAULT false, -- Mark favorites
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Vendor payments table
CREATE TABLE IF NOT EXISTS vendor_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Payment details
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE,
    scheduled_date DATE,
    status payment_status DEFAULT 'pending',
    
    -- Payment method
    payment_method TEXT, -- 'UPI', 'Bank Transfer', 'Cash', 'Cheque'
    transaction_id TEXT,
    
    -- Description
    description TEXT NOT NULL,
    payment_reason TEXT, -- What service/work this payment is for
    
    -- Invoice/Receipt
    invoice_number TEXT,
    receipt_url TEXT, -- Link to receipt/proof of payment
    
    -- Metadata
    paid_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Vendor project assignments (track which vendors worked on which projects)
CREATE TABLE IF NOT EXISTS vendor_project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Assignment details
    role TEXT, -- Specific role in this project
    rate DECIMAL(15, 2), -- Rate for this project
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2),
    
    -- Status
    status TEXT DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    
    -- Dates
    start_date DATE,
    end_date DATE,
    
    -- Metadata
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(vendor_id, project_id, role) -- Prevent duplicate assignments
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_project ON vendor_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON vendor_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_vendor_assignments_vendor ON vendor_project_assignments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_assignments_project ON vendor_project_assignments(project_id);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_project_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
DROP POLICY IF EXISTS "Allow authenticated users to view vendors" ON vendors;
CREATE POLICY "Allow authenticated users to view vendors"
    ON vendors FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to manage vendors" ON vendors;
CREATE POLICY "Allow admins to manage vendors"
    ON vendors FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- RLS Policies for vendor_payments
DROP POLICY IF EXISTS "Allow authenticated users to view payments" ON vendor_payments;
CREATE POLICY "Allow authenticated users to view payments"
    ON vendor_payments FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to manage payments" ON vendor_payments;
CREATE POLICY "Allow admins to manage payments"
    ON vendor_payments FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- RLS Policies for vendor_project_assignments
DROP POLICY IF EXISTS "Allow authenticated users to view assignments" ON vendor_project_assignments;
CREATE POLICY "Allow authenticated users to view assignments"
    ON vendor_project_assignments FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to manage assignments" ON vendor_project_assignments;
CREATE POLICY "Allow admins to manage assignments"
    ON vendor_project_assignments FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_payments_updated_at ON vendor_payments;
CREATE TRIGGER update_vendor_payments_updated_at
    BEFORE UPDATE ON vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_assignments_updated_at ON vendor_project_assignments;
CREATE TRIGGER update_vendor_assignments_updated_at
    BEFORE UPDATE ON vendor_project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update vendor stats when payment is made
CREATE OR REPLACE FUNCTION update_vendor_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE vendors
        SET total_amount_paid = total_amount_paid + NEW.amount
        WHERE id = NEW.vendor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vendor_stats_on_payment ON vendor_payments;
CREATE TRIGGER update_vendor_stats_on_payment
    AFTER INSERT OR UPDATE ON vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_stats();
-- Threaded replies: add parent_id to project_comments
alter table if exists project_comments
  add column if not exists parent_id uuid references project_comments(id) on delete cascade;

create index if not exists idx_project_comments_parent_id
  on project_comments(parent_id);
-- Fix RLS policies for project_files to ensure uploads persist after refresh
-- The issue is that the subquery in the SELECT policy might be cached or executed incorrectly

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and PMs can view project files" ON project_files;
DROP POLICY IF EXISTS "Admins and PMs can insert project files" ON project_files;
DROP POLICY IF EXISTS "Admins and PMs can update project files" ON project_files;
DROP POLICY IF EXISTS "Admins and PMs can delete project files" ON project_files;
DROP POLICY IF EXISTS "Clients can view their project files" ON project_files;

-- Create optimized policies that check role directly from auth.jwt()
-- This is more reliable than subqueries

-- Allow admins and project managers to view all project files
CREATE POLICY "Admins and PMs can view project files" ON project_files 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'project_manager')
        )
    )
);

-- Allow admins and project managers to insert project files
CREATE POLICY "Admins and PMs can insert project files" ON project_files 
FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'project_manager')
        )
    )
);

-- Allow admins and project managers to update project files
CREATE POLICY "Admins and PMs can update project files" ON project_files 
FOR UPDATE 
USING (
    auth.uid() IS NOT NULL 
    AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'project_manager')
        )
    )
);

-- Allow admins and project managers to delete project files
CREATE POLICY "Admins and PMs can delete project files" ON project_files 
FOR DELETE 
USING (
    auth.uid() IS NOT NULL 
    AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'project_manager')
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'project_manager')
        )
    )
);

-- Allow clients to view files from their own projects
CREATE POLICY "Clients can view their project files" ON project_files 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 
        FROM projects p 
        JOIN clients c ON p.client_id = c.id
        WHERE p.id = project_files.project_id 
        AND c.user_id = auth.uid()
    )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'project_files'
ORDER BY policyname;
-- Ensure clients can view their own client + projects via RLS
-- This migration is safe to re-run (drops/recreates policies).

-- CLIENTS
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Clients can view own client record" ON clients;
DROP POLICY IF EXISTS "Admins and PMs can view all clients" ON clients;

CREATE POLICY "Admins and PMs can view all clients" ON clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'project_manager')
    )
  );

CREATE POLICY "Clients can view own client record" ON clients
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND clients.user_id = auth.uid()
  );

-- PROJECTS
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Clients can view own projects" ON projects;

CREATE POLICY "Users can view assigned projects" ON projects
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      -- Admins and PMs see all
      EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'project_manager')
      )
      OR
      -- Creator sees their projects
      projects.created_by = auth.uid()
      OR
      -- Employees/team members see projects assigned to them
      EXISTS (
        SELECT 1
        FROM project_team pt
        WHERE pt.project_id = projects.id
          AND pt.user_id = auth.uid()
      )
      OR
      -- Clients see projects linked to their client record
      EXISTS (
        SELECT 1
        FROM clients c
        WHERE c.id = projects.client_id
          AND c.user_id = auth.uid()
      )
    )
  );

-- Optional hardening (commented): ensure clients.user_id is always set
-- ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
-- Add shared_with_client flag to invoices and RLS to allow client visibility of sent shared invoices

-- 1) Add column for sharing visibility
alter table if exists invoices
  add column if not exists shared_with_client boolean not null default false;

-- Helpful index for filtering
create index if not exists idx_invoices_shared_status on invoices(shared_with_client, status);

-- 2) Ensure RLS is enabled on invoices table
alter table invoices enable row level security;

-- 3) RLS: Allow clients (authenticated user matching clients.user_id) to select invoices
-- that are marked as 'sent' and shared_with_client=true and belong to them.
-- This policy is additive and does not affect existing admin policies.
drop policy if exists "Clients can view shared sent invoices" on invoices;

create policy "Clients can view shared sent invoices" on invoices
  for select
  using (
    auth.role() = 'authenticated'
    and status = 'sent'
    and shared_with_client = true
    and exists (
      select 1 from clients c
      where c.id = invoices.client_id
        and c.user_id = auth.uid()
    )
  );
-- Employee access policies for project detail (team members and creators)
-- Adds select/update access for employees on projects, milestones, tasks, and files.

-- Ensure RLS is enabled
alter table if exists projects enable row level security;
alter table if exists project_team enable row level security;
alter table if exists milestones enable row level security;
alter table if exists employee_tasks enable row level security;
alter table if exists project_files enable row level security;

-- Projects: creator or project_team member can select
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_project_access'
  ) THEN
    CREATE POLICY employee_project_access ON projects FOR SELECT
    USING (
      auth.uid() = created_by
      OR EXISTS (
        SELECT 1 FROM project_team pt
        WHERE pt.project_id = projects.id
          AND pt.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Milestones: visible to creator or project_team members via parent project
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_milestone_access'
  ) THEN
    CREATE POLICY employee_milestone_access ON milestones FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_team pt
        JOIN projects p ON p.id = milestones.project_id
        WHERE pt.project_id = milestones.project_id
          AND (pt.user_id = auth.uid() OR p.created_by = auth.uid())
      )
    );
  END IF;
END$$;

-- Employee tasks: only assignee can read/update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_task_read'
  ) THEN
    CREATE POLICY employee_task_read ON employee_tasks FOR SELECT
    USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_task_update'
  ) THEN
    CREATE POLICY employee_task_update ON employee_tasks FOR UPDATE
    USING (user_id = auth.uid());
  END IF;
END$$;

-- Project files: creator or project_team member can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_project_files_access'
  ) THEN
    CREATE POLICY employee_project_files_access ON project_files FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM project_team pt
        JOIN projects p ON p.id = project_files.project_id
        WHERE pt.project_id = project_files.project_id
          AND (pt.user_id = auth.uid() OR p.created_by = auth.uid())
      )
    );
  END IF;
END$$;
-- Allow employees and project owners to read their project_team rows
-- Needed for membership checks when loading project detail

alter table if exists project_team enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_project_team_select'
  ) THEN
    CREATE POLICY employee_project_team_select ON project_team FOR SELECT
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_team.project_id
          AND p.created_by = auth.uid()
      )
    );
  END IF;
END$$;
-- TEMPORARY: Fallback read policy so authenticated users can read projects
-- This alleviates visibility issues after tightened RLS. Remove once team- and role-based
-- access is fully validated in production.

ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'projects_fallback_read'
  ) THEN
    CREATE POLICY projects_fallback_read ON projects FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;
-- Fix recursive RLS between projects and project_team by simplifying team select policy

ALTER TABLE IF EXISTS project_team ENABLE ROW LEVEL SECURITY;

-- Drop the previous policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'employee_project_team_select' AND tablename = 'project_team'
  ) THEN
    DROP POLICY employee_project_team_select ON project_team;
  END IF;
END$$;

-- Minimal non-recursive policy: a user can see only their own project_team rows
CREATE POLICY project_team_select_own ON project_team FOR SELECT
USING (user_id = auth.uid());
-- Create avatars storage bucket for user profile pictures
-- Run this in Supabase SQL Editor

-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security policies for avatars bucket

-- Policy: Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access to all avatars
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Allow users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all messages if they're admin, PM, or employee
CREATE POLICY "Users can read messages if not client"
    ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager', 'employee')
        )
    );

-- Policy: Users can insert their own messages if they're admin, PM, or employee
CREATE POLICY "Users can insert own messages if not client"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager', 'employee')
        )
    );

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
    ON chat_messages
    FOR DELETE
    USING (auth.uid() = user_id);
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
-- Advertising system schema
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),
  target_role VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  position VARCHAR(50) DEFAULT 'top',
  display_frequency VARCHAR(50) DEFAULT 'always',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_type VARCHAR(50),
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure client_id exists on ad_analytics for older projects
ALTER TABLE ad_analytics
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Backfill missing columns on ad_analytics if the table existed previously
ALTER TABLE ad_analytics
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);
ALTER TABLE ad_analytics
  ADD COLUMN IF NOT EXISTS event_data JSONB;
ALTER TABLE ad_analytics
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Per-client targets
CREATE TABLE IF NOT EXISTS ad_targets (
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (ad_id, client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisements_role ON advertisements(target_role);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_ad_id ON ad_analytics(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_client_id ON ad_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_event_type ON ad_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_created_at ON ad_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_targets_ad ON ad_targets(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_targets_client ON ad_targets(client_id);

-- RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_targets ENABLE ROW LEVEL SECURITY;

-- Admins manage advertisements
DO $$ BEGIN
  CREATE POLICY "Admins can manage advertisements" ON advertisements
    FOR ALL USING (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    ) WITH CHECK (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated can view advertisements
DO $$ BEGIN
  CREATE POLICY "Authenticated users can view active advertisements" ON advertisements
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ad_analytics policies
DO $$ BEGIN
  CREATE POLICY "Only insert ad analytics events" ON ad_analytics
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Only admins can view ad analytics" ON ad_analytics
    FOR SELECT USING (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ad_targets policies
DO $$ BEGIN
  CREATE POLICY "Admins manage ad targets" ON ad_targets
    FOR ALL USING (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    ) WITH CHECK (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can read ad targets" ON ad_targets
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Create agency onboarding requests table
-- Run via supabase db push

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
  if not exists (
    select 1 from pg_policies
    where policyname = 'service_role_full_access' and tablename = 'agency_onboarding_requests'
  ) then
    create policy service_role_full_access
      on agency_onboarding_requests
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
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
-- Add agency_admin role to user_role enum
ALTER TYPE user_role ADD VALUE 'agency_admin' BEFORE 'admin';
-- Add logo_url column to agencies table
alter table if exists agencies add column if not exists logo_url text;

-- Add logo_url column to agency_onboarding_requests table
alter table if exists agency_onboarding_requests add column if not exists logo_url text;

-- Create agency-logos storage bucket (if it doesn't exist)
-- Note: Storage buckets must be created via the Supabase dashboard or via direct INSERT
-- This is a comment reminder that the bucket should exist
-- Add metadata and updated_at columns to agency_onboarding_requests table
alter table if exists agency_onboarding_requests add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists agency_onboarding_requests add column if not exists updated_at timestamptz default now();
