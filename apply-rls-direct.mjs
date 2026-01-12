import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

const sql = `
-- Enable RLS
ALTER TABLE IF EXISTS saas_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_organization_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_organization_usage ENABLE ROW LEVEL SECURITY;

-- Helper function
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

-- Drop old policies
DROP POLICY IF EXISTS "service_role_all_saas_orgs" ON saas_organizations;
DROP POLICY IF EXISTS "members_see_own_org" ON saas_organizations;
DROP POLICY IF EXISTS "service_role_all_members" ON saas_organization_members;
DROP POLICY IF EXISTS "members_see_self" ON saas_organization_members;
DROP POLICY IF EXISTS "members_see_org_members" ON saas_organization_members;
DROP POLICY IF EXISTS "service_role_all_payments" ON saas_organization_payments;
DROP POLICY IF EXISTS "members_see_org_payments" ON saas_organization_payments;
DROP POLICY IF EXISTS "service_role_all_usage" ON saas_organization_usage;
DROP POLICY IF EXISTS "members_see_org_usage" ON saas_organization_usage;

-- Create new policies
CREATE POLICY "service_role_all_saas_orgs"
  ON saas_organizations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "members_see_own_org"
  ON saas_organizations FOR SELECT
  USING (is_saas_org_member(id));

CREATE POLICY "service_role_all_members"
  ON saas_organization_members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "members_see_self"
  ON saas_organization_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "members_see_org_members"
  ON saas_organization_members FOR SELECT
  USING (is_saas_org_member(org_id));

CREATE POLICY "service_role_all_payments"
  ON saas_organization_payments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "members_see_org_payments"
  ON saas_organization_payments FOR SELECT
  USING (is_saas_org_member(org_id));

CREATE POLICY "service_role_all_usage"
  ON saas_organization_usage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "members_see_org_usage"
  ON saas_organization_usage FOR SELECT
  USING (is_saas_org_member(org_id));
`;

async function applyRLS() {
  console.log('🔧 Applying RLS policies...\n');
  
  try {
    // Execute via exec method if available
    const { error } = await supabase.rpc('exec_sql', { 
      sql_string: sql 
    }).catch(() => ({ error: { message: 'exec_sql not available' } }));
    
    if (error && error.message.includes('exec_sql')) {
      console.log('💡 Using sql() method instead...');
      // Try alternative - just show that it needs to be done
      console.log('❌ Could not apply RLS policies via API');
      console.log('✅ RLS policies must be applied manually in Supabase SQL Editor');
      console.log('\n📋 To apply:');
      console.log('1. Go to: https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql');
      console.log('2. Copy the SQL from SAAS_RLS_POLICIES.sql');
      console.log('3. Paste it into the SQL editor');
      console.log('4. Click RUN');
      return;
    }
    
    if (error) {
      console.log('❌ Error applying RLS:', error.message);
      return;
    }
    
    console.log('✅ RLS policies applied successfully!');
  } catch (err) {
    console.log('⚠️ Error:', err.message);
  }
}

applyRLS().catch(console.error);
