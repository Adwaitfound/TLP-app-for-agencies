import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6dW94dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTMyNDE4MCwiZXhwIjoxODI5MTMyNDE4MH0.1KqlRoVcLqZJkx1Xz6qLVz7CbKRBv0vwDjKRwb_xXFU'
);

async function executeSql(sql) {
  console.log('Executing:', sql.substring(0, 60) + '...');
  try {
    const { data, error } = await supabase.rpc('exec', { query: sql });
    if (error) {
      console.log('  Error:', error.message);
      return false;
    }
    console.log('  ✅ Success');
    return true;
  } catch (err) {
    console.log('  Error:', err.message);
    return false;
  }
}

const queries = [
  // Create helper functions
  `CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM saas_organization_members
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;`,

  `CREATE OR REPLACE FUNCTION is_org_admin(check_org_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;`,

  // Drop problematic policies
  `DROP POLICY IF EXISTS "View members of own organization" ON saas_organization_members;`,
  `DROP POLICY IF EXISTS "Admins can manage members" ON saas_organization_members;`,

  // Recreate with helper functions
  `CREATE POLICY "View members of own organization" ON saas_organization_members
    FOR SELECT
    USING (is_org_member(org_id));`,

  `CREATE POLICY "Admins can manage members" ON saas_organization_members
    FOR ALL
    USING (is_org_admin(org_id))
    WITH CHECK (is_org_admin(org_id));`,
];

async function main() {
  console.log('🔧 Fixing RLS Infinite Recursion...\n');
  
  let success = 0;
  for (const query of queries) {
    if (await executeSql(query)) {
      success++;
    }
  }

  console.log(`\n✅ Fix Applied: ${success}/${queries.length} queries executed`);
  console.log('\n📝 Changes Made:');
  console.log('  1. Created is_org_member() function (SECURITY DEFINER)');
  console.log('  2. Created is_org_admin() function (SECURITY DEFINER)');
  console.log('  3. Dropped old recursive policies');
  console.log('  4. Created new non-recursive policies');
  console.log('\n🎉 Ready to test setup page in incognito!');
}

main().catch(console.error);
