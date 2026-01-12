import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

async function testRLS() {
  console.log('🔍 Testing if RLS is blocking anon queries...\n');
  
  const userId = '03b42c20-3205-412b-8f0b-90fab223a7b1';
  
  // Quick test with service role
  console.log('1️⃣ Service role query:');
  const { data: serviceData, error: serviceError } = await supabase
    .from('saas_organization_members')
    .select('org_id, status')
    .eq('user_id', userId)
    .limit(1);
  
  if (serviceError) {
    console.log(`   ❌ Error: ${serviceError.message}`);
  } else {
    console.log(`   ✅ Found ${serviceData.length} record(s)`);
    if (serviceData.length > 0) {
      console.log(`      org_id: ${serviceData[0].org_id}`);
      console.log(`      status: ${serviceData[0].status}`);
    }
  }
}

testRLS().then(() => process.exit(0)).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

// Force exit after 5 seconds
setTimeout(() => {
  console.log('\n⏱️ Timeout - forcing exit');
  process.exit(0);
}, 5000);
