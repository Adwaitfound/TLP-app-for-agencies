-- ============================================================================
-- SETUP SCRIPT FOR MULTITENANT DATABASE
-- Run this after saas_core_tables.sql has been executed
-- ============================================================================

-- Step 1: Verify SaaS tables exist
-- Uncomment to check:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE 'saas_%';

-- ============================================================================
-- Step 2: Create Original Agency Organization
-- ============================================================================

-- First, get adwait's user ID from Supabase Auth
-- Go to: Supabase Dashboard → Authentication → Users
-- Find: adwait@thelostproject.in
-- Copy the UUID (first column)
-- Paste it below as {ADWAIT_USER_ID}

-- Create the original agency organization
INSERT INTO saas_organizations (
    name,
    slug,
    plan,
    status,
    subscription_started_at,
    subscription_ends_at,
    billing_cycle,
    settings
) VALUES (
    'The Lost Project',
    'the-lost-project',
    'premium',
    'active',
    NOW(),
    NULL,  -- No expiration for main agency
    'yearly',
    '{
        "color_scheme": "blue",
        "timezone": "UTC",
        "date_format": "DD-MM-YYYY",
        "business_type": "video_production"
    }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    plan = 'premium',
    status = 'active'
RETURNING id as original_org_id;

-- Save the returned org_id from above
-- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- Use this {ORIGINAL_ORG_ID} below

-- ============================================================================
-- Step 3: Add Original Agency Admin
-- ============================================================================

-- Replace {ORIGINAL_ORG_ID} with the ID from Step 2
-- Replace {ADWAIT_USER_ID} with adwait's auth user ID

INSERT INTO saas_organization_members (
    org_id,
    user_id,
    role,
    status,
    accepted_at,
    notes
) VALUES (
    '{ORIGINAL_ORG_ID}',
    '{ADWAIT_USER_ID}',
    'admin',
    'active',
    NOW(),
    'Super admin of original agency'
)
ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    accepted_at = NOW()
RETURNING id;

-- ============================================================================
-- Step 4: Initialize Usage Tracking
-- ============================================================================

INSERT INTO saas_organization_usage (
    org_id,
    projects_count,
    team_members_count,
    storage_used_gb
) VALUES (
    '{ORIGINAL_ORG_ID}',
    0,  -- Will be updated as projects are created
    1,  -- Just adwait
    0   -- Will be tracked as files uploaded
)
ON CONFLICT (org_id) DO NOTHING;

-- ============================================================================
-- Step 5: Verify Setup
-- ============================================================================

-- Check original organization created
SELECT 
    id,
    name,
    slug,
    plan,
    status,
    created_at
FROM saas_organizations
WHERE slug = 'the-lost-project';

-- Check admin added
SELECT 
    om.id,
    om.role,
    om.status,
    u.email
FROM saas_organization_members om
JOIN auth.users u ON om.user_id = u.id
WHERE om.org_id = '{ORIGINAL_ORG_ID}';

-- ============================================================================
-- Step 6: Create Test Tenant (Optional - for testing)
-- ============================================================================

-- Create test tenant organization
INSERT INTO saas_organizations (
    name,
    slug,
    plan,
    status,
    trial_started_at,
    trial_ends_at,
    billing_cycle
) VALUES (
    'Test Tenant Agency',
    'test-tenant',
    'standard',
    'trial',
    NOW(),
    NOW() + INTERVAL '14 days',
    'monthly'
)
RETURNING id as test_org_id;

-- Save the test_org_id for later reference
-- Example: 'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4'

-- ============================================================================
-- Step 7: Enable RLS Policies
-- ============================================================================

-- Enable RLS for original data tables (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Enable RLS for SaaS tables
ALTER TABLE saas_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_organization_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for organizations
CREATE POLICY org_isolation_read ON saas_organizations
FOR SELECT USING (
    id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY org_isolation_update ON saas_organizations
FOR UPDATE USING (
    id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- Create RLS policy for organization members
CREATE POLICY member_isolation_read ON saas_organization_members
FOR SELECT USING (
    org_id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
    )
);

-- Create RLS policy for usage tracking
CREATE POLICY usage_isolation_read ON saas_organization_usage
FOR SELECT USING (
    org_id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
    )
);

-- Create RLS policy for payments
CREATE POLICY payment_isolation_read ON saas_organization_payments
FOR SELECT USING (
    org_id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- ============================================================================
-- Step 8: Verification Queries
-- ============================================================================

-- Count organizations
SELECT COUNT(*) as total_organizations FROM saas_organizations;

-- Count organization members
SELECT COUNT(*) as total_members FROM saas_organization_members;

-- Check the original organization
SELECT 
    so.name,
    so.slug,
    so.plan,
    COUNT(som.*) as member_count
FROM saas_organizations so
LEFT JOIN saas_organization_members som ON so.id = som.org_id
GROUP BY so.id;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Replace placeholders in this script with actual values:
-- {ORIGINAL_ORG_ID} = UUID of organization created in Step 2
-- {ADWAIT_USER_ID} = UUID of adwait's auth.users record

-- After running this script:
-- 1. ✅ Original agency organization exists
-- 2. ✅ adwait@thelostproject.in is admin of original org
-- 3. ✅ SaaS tables have RLS policies enabled
-- 4. ✅ Ready for local testing

-- To test:
-- 1. Login as adwait@thelostproject.in
-- 2. Middleware should allow access to /dashboard
-- 3. Should see original data only
-- 4. Try to access /v2/dashboard - should redirect back to /dashboard

-- ============================================================================
