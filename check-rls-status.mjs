import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

async function checkPolicies() {
  console.log('🔍 Checking current RLS policies...\n');
  
  // Query the system tables to see what policies exist
  try {
    const { data, error } = await supabase.from('information_schema.table_privileges')
      .select('*')
      .match({ table_name: 'saas_organization_members' })
      .limit(10);
    
    if (error) {
      console.log('❌ Could not query system table:', error.message);
    }
    
    console.log('📊 Checking table stats:');
    
    // Check organizations
    const { count: orgCount } = await supabase
      .from('saas_organizations')
      .select('*', { count: 'exact' })
      .limit(1);
    console.log(`\n✅ Organizations: ${orgCount} record(s)`);
    
    // Check members
    const { count: memberCount } = await supabase
      .from('saas_organization_members')
      .select('*', { count: 'exact' })
      .limit(1);
    console.log(`✅ Organization Members: ${memberCount} record(s)`);
    
    // Check payments
    const { count: paymentCount } = await supabase
      .from('saas_organization_payments')
      .select('*', { count: 'exact' })
      .limit(1);
    console.log(`✅ Payments: ${paymentCount} record(s)`);
    
    console.log('\n⚠️ Note: If count is "null" or "-1", RLS policies may be blocking the query');
    
  } catch (err) {
    console.log('Error:', err.message);
  }
}

checkPolicies().catch(console.error);
