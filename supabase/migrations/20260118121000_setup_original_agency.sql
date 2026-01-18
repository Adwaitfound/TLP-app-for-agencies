-- ============================================================================
-- Setup original agency and admin membership (migration)
-- Depends on: 20260118120000_saas_core_tables.sql
-- ============================================================================

-- Create The Lost Project organization if not exists
INSERT INTO saas_organizations (
    name, slug, plan, status, subscription_started_at, billing_cycle, settings
) VALUES (
    'The Lost Project',
    'the-lost-project',
    'premium',
    'active',
    NOW(),
    'yearly',
    '{
        "color_scheme": "blue",
        "timezone": "UTC",
        "date_format": "DD-MM-YYYY",
        "business_type": "video_production"
    }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Add Adwait as admin (id provided at runtime via application, here we keep it fixed per request)
DO $$
DECLARE v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM saas_organizations WHERE slug = 'the-lost-project' LIMIT 1;
  IF v_org_id IS NOT NULL THEN
    INSERT INTO saas_organization_members (org_id, user_id, role, status, accepted_at)
    VALUES (v_org_id, 'd9d0e87d-c313-4ee9-a939-c073c86791f7'::uuid, 'admin', 'active', NOW())
    ON CONFLICT (org_id, user_id) DO NOTHING;

    INSERT INTO saas_organization_usage (
      org_id, projects_count, team_members_count, clients_count, storage_used_bytes, api_calls_this_month, plan,
      max_team_members, max_clients, max_storage_bytes, period
    )
    SELECT v_org_id, 0, 0, 0, 0, 0, 'premium', 100, 100, 500::bigint*1024*1024*1024, 'current'
    WHERE NOT EXISTS (
      SELECT 1 FROM saas_organization_usage WHERE org_id = v_org_id
    );
  END IF;
END $$;

-- Verification (safe selects)
-- SELECT * FROM saas_organizations WHERE slug = 'the-lost-project';
-- SELECT * FROM saas_organization_members WHERE org_id = (SELECT id FROM saas_organizations WHERE slug='the-lost-project');
