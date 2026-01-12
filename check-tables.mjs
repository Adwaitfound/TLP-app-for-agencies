import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

async function checkTables() {
  // Try different table names
  const tableNames = [
    'saas_organizations',
    'organizations',
    'saas_organization_members', 
    'organization_members',
    'saas_organization_payments',
    'organization_payments',
    'users',
    'agency'
  ];

  for (const tableName of tableNames) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(5);
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: ${count} records`);
        if (data && data.length > 0) {
          console.log(`   Sample:`, JSON.stringify(data[0], null, 2));
        }
      }
    } catch (e) {
      console.log(`❌ ${tableName}: Error - ${e.message}`);
    }
  }
}

checkTables().catch(console.error);
