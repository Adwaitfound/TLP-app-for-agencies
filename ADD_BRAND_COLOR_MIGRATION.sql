-- Migration: Add brand_color to saas_organizations settings
-- This adds support for custom brand color selection in the admin dashboard

-- Update existing records to ensure settings has the brand_color field
UPDATE saas_organizations 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{brand_color}',
  '"blue"'::jsonb,
  true
)
WHERE settings->>'brand_color' IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_org_brand_color ON saas_organizations USING GIN (settings);

-- Create or replace helper function to get org branding
CREATE OR REPLACE FUNCTION get_org_branding(org_id UUID)
RETURNS TABLE(name TEXT, brand_color TEXT, website TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    saas_organizations.name,
    COALESCE(saas_organizations.settings->>'brand_color', 'blue') as brand_color,
    saas_organizations.website
  FROM saas_organizations
  WHERE saas_organizations.id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for branding queries
ALTER TABLE saas_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_see_branding" ON saas_organizations;
CREATE POLICY "members_see_branding"
  ON saas_organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saas_organization_members
      WHERE saas_organization_members.org_id = saas_organizations.id
      AND saas_organization_members.user_id = auth.uid()
      AND saas_organization_members.status = 'active'
    )
  );
