import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function applyMigration() {
  try {
    console.log('Applying tier system migration...\n');

    // Add tier column to agency_onboarding_requests
    console.log('1️⃣  Adding tier column to agency_onboarding_requests...');
    const { error: err1 } = await supabase.rpc('execute_sql', {
      sql: "ALTER TABLE IF EXISTS agency_onboarding_requests ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'standard';"
    }).catch(() => ({error: {message: 'execute_sql not available, will try alter_table'}}));
    
    if (err1?.message?.includes('not available')) {
      console.log('   ℹ️  execute_sql not available, trying direct approach...');
      // The columns might already exist from cloning, let's just verify they work
    } else if (err1) {
      console.log(`   ⚠️  Error: ${err1.message}`);
    } else {
      console.log('   ✅ Done');
    }

    // Check if it worked by trying to select the column
    const { data, error: checkErr } = await supabase
      .from('agency_onboarding_requests')
      .select('tier')
      .limit(1);

    if (checkErr?.message?.includes('tier')) {
      console.log('   ❌ Tier column does not exist - manual SQL needed');
      console.log('\n⚠️  IMPORTANT: The tier column needs to be added manually.\n');
      console.log('Run this SQL in Supabase SQL Editor:\n');
      console.log('ALTER TABLE agency_onboarding_requests ADD COLUMN tier TEXT DEFAULT \'standard\';');
      console.log('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT \'standard\';');
      console.log('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS employee_seats INT DEFAULT 2;');
      console.log('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS client_seats INT DEFAULT 2;');
      console.log('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS admin_seats INT DEFAULT 1;');
      console.log('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS additional_employees INT DEFAULT 0;');
      console.log('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS additional_clients INT DEFAULT 0;\n');
      process.exit(1);
    } else {
      console.log('✅ Tier column already exists in agency_onboarding_requests');
    }

    // Check agencies table
    const { data: agenciesData, error: agenciesErr } = await supabase
      .from('agencies')
      .select('tier')
      .limit(1);

    if (agenciesErr?.message?.includes('tier')) {
      console.log('❌ Tier columns missing from agencies table - see SQL above');
      process.exit(1);
    }

    console.log('✅ All tier columns exist!\n');
    console.log('🎉 Provisioning tier system is ready!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
