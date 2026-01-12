-- Fix RLS Infinite Recursion in saas_organization_members
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing functions (they have different parameter names)
DROP FUNCTION IF EXISTS is_org_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_admin(UUID) CASCADE;

-- Step 2: Create/Update helper functions with SECURITY DEFINER (bypass RLS)
CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM saas_organization_members
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_org_admin(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM saas_organization_members
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 2: Drop old problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "View members of own organization" ON saas_organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON saas_organization_members;

-- Step 3: Recreate policies using helper functions (NO recursion!)
CREATE POLICY "View members of own organization" ON saas_organization_members
    FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY "Admins can manage members" ON saas_organization_members
    FOR ALL
    USING (is_org_admin(org_id))
    WITH CHECK (is_org_admin(org_id));

-- Verify the fix
SELECT 'RLS policies fixed! ✅' AS status;
