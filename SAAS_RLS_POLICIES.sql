-- Fix RLS policies for SaaS organization tables
-- Run this in Supabase SQL Editor

-- Enable RLS on SaaS tables if not already enabled
ALTER TABLE IF EXISTS saas_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_organization_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_organization_usage ENABLE ROW LEVEL SECURITY;

-- Create helper function to check org membership (SECURITY DEFINER so it works with RLS)
CREATE OR REPLACE FUNCTION is_saas_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM saas_organization_members
    WHERE saas_organization_members.org_id = $1
    AND saas_organization_members.user_id = auth.uid()
    AND saas_organization_members.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for saas_organizations
DROP POLICY IF EXISTS "service_role_all_saas_orgs" ON saas_organizations;
CREATE POLICY "service_role_all_saas_orgs"
  ON saas_organizations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "members_see_own_org" ON saas_organizations;
CREATE POLICY "members_see_own_org"
  ON saas_organizations FOR SELECT
  USING (is_saas_org_member(id));

-- RLS Policies for saas_organization_members
DROP POLICY IF EXISTS "service_role_all_members" ON saas_organization_members;
CREATE POLICY "service_role_all_members"
  ON saas_organization_members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "members_see_self" ON saas_organization_members;
CREATE POLICY "members_see_self"
  ON saas_organization_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "members_see_org_members" ON saas_organization_members;
CREATE POLICY "members_see_org_members"
  ON saas_organization_members FOR SELECT
  USING (is_saas_org_member(org_id));

-- RLS Policies for saas_organization_payments
DROP POLICY IF EXISTS "service_role_all_payments" ON saas_organization_payments;
CREATE POLICY "service_role_all_payments"
  ON saas_organization_payments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "members_see_org_payments" ON saas_organization_payments;
CREATE POLICY "members_see_org_payments"
  ON saas_organization_payments FOR SELECT
  USING (is_saas_org_member(org_id));

-- RLS Policies for saas_organization_usage
DROP POLICY IF EXISTS "service_role_all_usage" ON saas_organization_usage;
CREATE POLICY "service_role_all_usage"
  ON saas_organization_usage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "members_see_org_usage" ON saas_organization_usage;
CREATE POLICY "members_see_org_usage"
  ON saas_organization_usage FOR SELECT
  USING (is_saas_org_member(org_id));
