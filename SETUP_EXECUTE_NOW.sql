-- ============================================================================
-- EXECUTE THIS IN SUPABASE SQL EDITOR - IN TWO PARTS
-- ============================================================================

-- 📋 PART 1: Create Multi-Tenant Tables
-- ✅ Copy the ENTIRE content of saas_core_tables.sql
-- ✅ Paste into Supabase SQL Editor
-- ✅ Click RUN
-- ✅ Wait for success message

-- 📋 PART 2: Setup Original Agency (Run AFTER Part 1)
-- Execute the script below in Supabase SQL Editor:

-- ============================================================================
-- CREATE ORIGINAL AGENCY ORGANIZATION
-- ============================================================================

-- Create "The Lost Project" organization
INSERT INTO saas_organizations (
    name,
    slug,
    plan,
    status,
    subscription_started_at,
    billing_cycle,
    settings
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
ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- ============================================================================
-- ADD ADWAIT AS ORGANIZATION ADMIN
-- ============================================================================

-- Insert adwait as admin of the organization
INSERT INTO saas_organization_members (
    org_id,
    user_id,
    role,
    status,
    accepted_at
)
SELECT 
    org.id,
    'd9d0e87d-c313-4ee9-a939-c073c86791f7'::uuid,  -- adwait's user ID
    'admin',
    'active',
    NOW()
FROM saas_organizations org
WHERE org.slug = 'the-lost-project'
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ============================================================================
-- INITIALIZE ORGANIZATION USAGE TRACKING
-- ============================================================================

INSERT INTO saas_organization_usage (
    org_id,
    projects_used,
    invoices_used,
    clients_used,
    storage_used_mb,
    api_calls_used,
    reset_at
)
SELECT 
    org.id,
    0,
    0,
    0,
    0,
    0,
    DATE_TRUNC('month', NOW() + INTERVAL '1 month')
FROM saas_organizations org
WHERE org.slug = 'the-lost-project'
ON CONFLICT (org_id) DO NOTHING;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

-- Check organization was created
SELECT 'Organization' as item, COUNT(*) as count FROM saas_organizations WHERE slug = 'the-lost-project';

-- Check admin membership
SELECT 'Admin Member' as item, COUNT(*) as count FROM saas_organization_members 
WHERE org_id = (SELECT id FROM saas_organizations WHERE slug = 'the-lost-project')
AND user_id = 'd9d0e87d-c313-4ee9-a939-c073c86791f7'::uuid
AND role = 'admin';

-- Check usage tracking
SELECT 'Usage Record' as item, COUNT(*) as count FROM saas_organization_usage 
WHERE org_id = (SELECT id FROM saas_organizations WHERE slug = 'the-lost-project');

-- ============================================================================
-- VIEW COMPLETE SETUP
-- ============================================================================

-- View the organization
SELECT 
    'Organization Setup' as type,
    id as org_id,
    name,
    slug,
    plan,
    status,
    created_at
FROM saas_organizations
WHERE slug = 'the-lost-project';

-- View the admin member
SELECT 
    'Admin Membership' as type,
    org_id,
    user_id,
    role,
    status,
    created_at
FROM saas_organization_members
WHERE org_id = (SELECT id FROM saas_organizations WHERE slug = 'the-lost-project')
AND user_id = 'd9d0e87d-c313-4ee9-a939-c073c86791f7'::uuid;
