import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6dW94dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTMyNDE4MCwiZXhwIjoxODI5MTMyNDE4MH0.1KqlRoVcLqZJkx1Xz6qLVz7CbKRBv0vwDjKRwb_xXFU'
);

// SQL queries as individual statements
const sqlQueries = `
-- Create is_org_member function
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

-- Create is_org_admin function  
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

-- Drop problematic policies
DROP POLICY IF EXISTS "View members of own organization" ON saas_organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON saas_organization_members;

-- Create new policies using helper functions
CREATE POLICY "View members of own organization" ON saas_organization_members
    FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY "Admins can manage members" ON saas_organization_members
    FOR ALL
    USING (is_org_admin(org_id))
    WITH CHECK (is_org_admin(org_id));
`;

async function main() {
  console.log('📝 RLS Fix SQL Statement:\n');
  console.log(sqlQueries);
  
  console.log('\n✅ To apply this fix:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql/new');
  console.log('2. Click "New query"');
  console.log('3. Copy and paste the SQL above');
  console.log('4. Click "Run"');
  console.log('\n🎯 This will:');
  console.log('  • Create is_org_member() function with SECURITY DEFINER');
  console.log('  • Create is_org_admin() function with SECURITY DEFINER');
  console.log('  • Drop old recursive policies');
  console.log('  • Create new non-recursive policies');
  console.log('\n💾 Alternatively, save and use: psql -f FIX_RLS_RECURSION.sql');
}

main();
