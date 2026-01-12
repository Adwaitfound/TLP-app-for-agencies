import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- Make org_id nullable and add 'free' to plan_type check
ALTER TABLE saas_organization_payments 
ALTER COLUMN org_id DROP NOT NULL;

ALTER TABLE saas_organization_payments 
DROP CONSTRAINT IF EXISTS saas_organization_payments_plan_type_check;

ALTER TABLE saas_organization_payments 
ADD CONSTRAINT saas_organization_payments_plan_type_check 
CHECK (plan_type IN ('free', 'standard', 'premium'));

-- Add comment explaining why org_id is nullable
COMMENT ON COLUMN saas_organization_payments.org_id IS 'Nullable: Payment is created before organization (linked after webhook creates org)';
`;

console.log('🔧 Running payment table migration...\n');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

if (error) {
  console.error('❌ Migration failed:', error);
  console.log('\n📋 Copy and paste this SQL into Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql/new\n');
  console.log(sql);
} else {
  console.log('✅ Migration completed successfully!');
  console.log('   - org_id is now NULLABLE');
  console.log('   - plan_type accepts: free, standard, premium');
  console.log('\n💡 Payment records can now be created before organizations exist.');
}
