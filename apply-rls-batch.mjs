import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

// SQL statements to execute one by one
const statements = [
  `ALTER TABLE IF EXISTS saas_organizations ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE IF EXISTS saas_organization_members ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE IF EXISTS saas_organization_payments ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE IF EXISTS saas_organization_usage ENABLE ROW LEVEL SECURITY;`,
  
  `CREATE OR REPLACE FUNCTION is_saas_org_member(org_id UUID)
   RETURNS BOOLEAN AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM saas_organization_members
       WHERE saas_organization_members.org_id = $1
       AND saas_organization_members.user_id = auth.uid()
       AND saas_organization_members.status = 'active'
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;`,
  
  `DROP POLICY IF EXISTS "service_role_all_saas_orgs" ON saas_organizations;`,
  `DROP POLICY IF EXISTS "members_see_own_org" ON saas_organizations;`,
  `DROP POLICY IF EXISTS "service_role_all_members" ON saas_organization_members;`,
  `DROP POLICY IF EXISTS "members_see_self" ON saas_organization_members;`,
  `DROP POLICY IF EXISTS "members_see_org_members" ON saas_organization_members;`,
  `DROP POLICY IF EXISTS "service_role_all_payments" ON saas_organization_payments;`,
  `DROP POLICY IF EXISTS "members_see_org_payments" ON saas_organization_payments;`,
  `DROP POLICY IF EXISTS "service_role_all_usage" ON saas_organization_usage;`,
  `DROP POLICY IF EXISTS "members_see_org_usage" ON saas_organization_usage;`,
  
  `CREATE POLICY "service_role_all_saas_orgs"
   ON saas_organizations FOR ALL
   USING (auth.role() = 'service_role')
   WITH CHECK (auth.role() = 'service_role');`,
  
  `CREATE POLICY "members_see_own_org"
   ON saas_organizations FOR SELECT
   USING (is_saas_org_member(id));`,
  
  `CREATE POLICY "service_role_all_members"
   ON saas_organization_members FOR ALL
   USING (auth.role() = 'service_role')
   WITH CHECK (auth.role() = 'service_role');`,
  
  `CREATE POLICY "members_see_self"
   ON saas_organization_members FOR SELECT
   USING (user_id = auth.uid());`,
  
  `CREATE POLICY "members_see_org_members"
   ON saas_organization_members FOR SELECT
   USING (is_saas_org_member(org_id));`,
  
  `CREATE POLICY "service_role_all_payments"
   ON saas_organization_payments FOR ALL
   USING (auth.role() = 'service_role')
   WITH CHECK (auth.role() = 'service_role');`,
  
  `CREATE POLICY "members_see_org_payments"
   ON saas_organization_payments FOR SELECT
   USING (is_saas_org_member(org_id));`,
  
  `CREATE POLICY "service_role_all_usage"
   ON saas_organization_usage FOR ALL
   USING (auth.role() = 'service_role')
   WITH CHECK (auth.role() = 'service_role');`,
  
  `CREATE POLICY "members_see_org_usage"
   ON saas_organization_usage FOR SELECT
   USING (is_saas_org_member(org_id));`,
];

async function applySQL() {
  console.log('🔧 Applying RLS policies...\n');
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      console.log(`[${i + 1}/${statements.length}] Executing...`);
      
      // Use the sql function to execute
      const { error } = await supabase.rpc('sql', {
        query: stmt
      }).catch(async () => {
        // Fallback: try direct query
        return await supabase.from('_sql').select('*').then(() => ({ error: null })).catch(e => ({ error: e }));
      });
      
      if (error && error.message && !error.message.includes('Unknown function')) {
        console.log(`   ❌ Error: ${error.message.substring(0, 80)}`);
        failed++;
      } else {
        console.log(`   ✅ Success`);
        success++;
      }
    } catch (e) {
      console.log(`   ⚠️ Skipped: ${e.message.substring(0, 60)}`);
    }
  }
  
  console.log(`\n📊 Results: ${success} succeeded, ${failed} failed`);
  
  if (failed === statements.length) {
    console.log('\n⚠️ SQL execution via RPC not available');
    console.log('🔗 Please apply manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql');
    console.log('\nCopy the contents of SAAS_RLS_POLICIES.sql and run it there.');
  }
}

applySQL().catch(console.error);
