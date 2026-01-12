import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

async function testRLS() {
  console.log('🔍 Testing RLS policies...\n');
  
  const userId = '03b42c20-3205-412b-8f0b-90fab223a7b1';
  const orgId = 'a5f10f7e-699b-4b3f-ba25-0d393fea1b87';
  
  // Test 1: Check if function exists
  console.log('1️⃣ Checking if is_saas_org_member function exists...');
  try {
    const { data, error } = await supabase.rpc('is_saas_org_member', {
      org_id: orgId
    });
    
    if (error) {
      console.log(`   ❌ Function error: ${error.message}`);
    } else {
      console.log(`   ✅ Function works: ${data}`);
    }
  } catch (e) {
    console.log(`   ⚠️ Could not test function: ${e.message}`);
  }
  
  // Test 2: Check current policies on the table
  console.log('\n2️⃣ Checking policies on saas_organization_members...');
  try {
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'saas_organization_members')
      .limit(10);
    
    if (error) {
      console.log(`   ❌ Could not query policies: ${error.message}`);
    } else {
      console.log(`   ✅ Found policies:`, data);
    }
  } catch (e) {
    console.log(`   ⚠️ Table doesn't exist`);
  }
  
  // Test 3: Try the exact query from login page with service role
  console.log('\n3️⃣ Testing service role query...');
  const { data: serviceData, error: serviceError } = await supabase
    .from('saas_organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  if (serviceError) {
    console.log(`   ❌ Service role error: ${serviceError.message}`);
  } else {
    console.log(`   ✅ Service role success: ${JSON.stringify(serviceData)}`);
  }
  
  // Test 4: Try with anon client
  console.log('\n4️⃣ Testing anon client query (simulating login page)...');
  const anonSupabase = createClient(
    'https://frinqtylwgzquoxvqhxb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6cXVveHZxaHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MzM3MTMsImV4cCI6MjA4MTMwOTcxM30.OH2LsFhlo-TpFc42IIWKOTh06sD07CkAYnF1bknyE_Y'
  );
  
  // Sign in as the user first
  const { data: authData, error: authError } = await anonSupabase.auth.signInWithPassword({
    email: 'social@thefoundproject.com',
    password: 'TestPassword@123'  // Wrong password, but we just want to test
  }).catch(() => ({ data: null, error: { message: 'Auth failed (expected)' } }));
  
  const { data: anonData, error: anonError } = await anonSupabase
    .from('saas_organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  if (anonError) {
    console.log(`   ❌ Anon query error: ${anonError.message}`);
    console.log(`      This is why login redirects to old dashboard!`);
  } else {
    console.log(`   ✅ Anon query success: ${JSON.stringify(anonData)}`);
  }
  
  // Test 5: Check what RLS policies exist
  console.log('\n5️⃣ Getting list of all RLS policies on saas_organization_members...');
  const { data: allPolicies } = await supabase.rpc('sql', {
    query: `SELECT schemaname, tablename, policyname, cmd, permissive 
            FROM pg_policies 
            WHERE tablename = 'saas_organization_members'
            ORDER BY policyname;`
  }).catch(() => ({ data: null }));
  
  if (!allPolicies) {
    // Try alternative
    console.log('   (Could not fetch via RPC, checking manually...)');
  } else {
    console.log('   Policies:', allPolicies);
  }
}

testRLS().catch(console.error);
