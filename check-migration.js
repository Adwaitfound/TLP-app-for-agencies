const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkMigration() {
  console.log('🔍 Checking migration status...\n');
  
  const tablesToCheck = [
    'saas_organizations',
    'saas_organization_members',
    'saas_organization_payments',
    'saas_organization_usage',
    'saas_magic_links'
  ];
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: NOT FOUND`);
      } else {
        console.log(`✅ ${tableName}: EXISTS (${count || 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ERROR -`, err.message);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log('If all 5 tables show ✅, migration is complete!');
  console.log('If any show ❌, run the SQL in Supabase SQL Editor\n');
}

checkMigration();
