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
