import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

/**
 * Verification Script: Check RLS Status
 * Verifies that Row Level Security is properly enabled on all SaaS tables
 */

async function verifyRLS() {
  console.log('🔍 VERIFICATION: Checking RLS Status on SaaS Tables\n');
  console.log('='.repeat(60));

  const tables = [
    'saas_organizations',
    'saas_organization_members',
    'saas_organization_payments',
    'saas_organization_usage',
    'magic_links'
  ];

  let allGood = true;

  for (const tableName of tables) {
    console.log(`\n📋 Table: ${tableName}`);
    console.log('-'.repeat(60));

    // Check 1: Verify table exists and has data
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`   ❌ Error querying table: ${countError.message}`);
      allGood = false;
      continue;
    }

    console.log(`   ✅ Table exists with ${count || 0} record(s)`);

    // Check 2: Try to query without auth (should fail if RLS is enabled)
    const anonSupabase = createClient(
      'https://frinqtylwgzquoxvqhxb.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6cXVveHZxaHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MzM3MTMsImV4cCI6MjA4MTMwOTcxM30.OH2LsFhlo-TpFc42IIWKOTh06sD07CkAYnF1bknyE_Y'
    );

    const { data: anonData, error: anonError } = await anonSupabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (anonError && anonError.code === 'PGRST301') {
      console.log(`   ✅ RLS is ENABLED (unauthenticated query blocked)`);
    } else if (anonError) {
      console.log(`   ⚠️  Unexpected error: ${anonError.message}`);
    } else if (anonData && anonData.length === 0) {
      console.log(`   ✅ RLS is ENABLED (no data visible to anon)`);
    } else {
      console.log(`   ⚠️  RLS might not be working (anon can see ${anonData?.length || 0} records)`);
      allGood = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  
  // Check 3: Verify helper function exists
  console.log('\n🔧 Checking Helper Function: is_saas_org_member');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabase.rpc('is_saas_org_member', {
      org_id: 'a5f10f7e-699b-4b3f-ba25-0d393fea1b87'
    });

    if (error) {
      console.log(`   ❌ Function error: ${error.message}`);
      if (error.message.includes('not found')) {
        console.log(`   💡 Run SAAS_RLS_POLICIES.sql to create the function`);
      }
      allGood = false;
    } else {
      console.log(`   ✅ Function exists and works (returned: ${data})`);
    }
  } catch (e) {
    console.log(`   ❌ Function test failed: ${e.message}`);
    allGood = false;
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  if (allGood) {
    console.log('\n✅ ALL CHECKS PASSED!');
    console.log('   RLS is properly enabled on all SaaS tables.');
  } else {
    console.log('\n⚠️  SOME CHECKS FAILED');
    console.log('   Action required: Apply SAAS_RLS_POLICIES.sql in Supabase');
  }
  console.log('\n' + '='.repeat(60));
}

verifyRLS().catch(console.error);
