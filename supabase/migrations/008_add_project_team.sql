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
