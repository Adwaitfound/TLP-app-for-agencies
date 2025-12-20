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

