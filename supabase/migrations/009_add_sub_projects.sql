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
