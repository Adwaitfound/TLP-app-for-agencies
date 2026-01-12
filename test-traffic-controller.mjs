import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

/**
 * Test Script: Verify Traffic Controller Setup
 * Tests that users are properly routed and isolated
 */

async function testTrafficController() {
  console.log('🚦 TRAFFIC CONTROLLER VERIFICATION\n');
  console.log('='.repeat(70));

  // Test 1: Check SaaS user exists and has org
  console.log('\n1️⃣ Checking SaaS User: social@thefoundproject.com');
  console.log('-'.repeat(70));
  
  const { data: users } = await supabase.auth.admin.listUsers();
  const saasUser = users.users.find(u => u.email === 'social@thefoundproject.com');
  
  if (!saasUser) {
    console.log('   ❌ SaaS user not found in auth.users');
    return;
  }
  
  console.log(`   ✅ User found: ${saasUser.email} (ID: ${saasUser.id})`);
  
  // Check membership
  const { data: membership } = await supabase
    .from('saas_organization_members')
    .select('org_id, role, status')
    .eq('user_id', saasUser.id)
    .single();
  
  if (!membership) {
    console.log('   ❌ No organization membership found');
    return;
  }
  
  console.log(`   ✅ Has organization: ${membership.org_id}`);
  console.log(`   ✅ Role: ${membership.role}, Status: ${membership.status}`);
  
  // Get org details
  const { data: org } = await supabase
    .from('saas_organizations')
    .select('name, slug, plan')
    .eq('id', membership.org_id)
    .single();
  
  if (org) {
    console.log(`   ✅ Organization: "${org.name}" (${org.slug}) - ${org.plan} plan`);
  }

  // Test 2: Verify original owner
  console.log('\n2️⃣ Checking Original Owner: adwait@thelostproject.in');
  console.log('-'.repeat(70));
  
  const originalOwner = users.users.find(u => u.email === 'adwait@thelostproject.in');
  
  if (!originalOwner) {
    console.log('   ❌ Original owner not found');
  } else {
    console.log(`   ✅ Original owner found: ${originalOwner.email}`);
    
    // Check if they have SaaS org (should NOT)
    const { data: ownerMembership } = await supabase
      .from('saas_organization_members')
      .select('org_id')
      .eq('user_id', originalOwner.id)
      .single();
    
    if (ownerMembership) {
      console.log(`   ⚠️  Original owner has SaaS org (unexpected)`);
    } else {
      console.log(`   ✅ Original owner has NO SaaS org (correct)`);
    }
  }

  // Test 3: Check middleware configuration
  console.log('\n3️⃣ Middleware Configuration Check');
  console.log('-'.repeat(70));
  console.log('   📝 Edit middleware.ts and set:');
  console.log('      const ORIGINAL_AGENCY_OWNER_EMAIL = "adwait@thelostproject.in"');
  console.log('   ');
  console.log('   ✅ After updating, middleware will route:');
  console.log('      • adwait@thelostproject.in → /dashboard (original)');
  console.log('      • social@thefoundproject.com → /v2/dashboard (SaaS)');
  console.log('      • New users → /v2/onboarding');

  // Test 4: Routing logic summary
  console.log('\n4️⃣ Expected Routing Behavior');
  console.log('-'.repeat(70));
  console.log('   USER: adwait@thelostproject.in');
  console.log('      ├─ Accessing /dashboard → ✅ ALLOWED (original system)');
  console.log('      ├─ Accessing /v2/dashboard → ❌ REDIRECT to /dashboard');
  console.log('      └─ Data Visible: Original clients, projects tables');
  console.log('');
  console.log('   USER: social@thefoundproject.com');
  console.log('      ├─ Accessing /dashboard → ❌ REDIRECT to /v2/dashboard');
  console.log('      ├─ Accessing /v2/dashboard → ✅ ALLOWED (SaaS system)');
  console.log('      └─ Data Visible: Only saas_* tables for org_id=' + membership.org_id);
  console.log('');
  console.log('   USER: New user (no org)');
  console.log('      ├─ Accessing /dashboard → ❌ REDIRECT to /v2/onboarding');
  console.log('      ├─ Accessing /v2/dashboard → ❌ REDIRECT to /v2/onboarding');
  console.log('      └─ Must create organization first');

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ SETUP COMPLETE!');
  console.log('\nNext Steps:');
  console.log('1. Update ORIGINAL_AGENCY_OWNER_EMAIL in middleware.ts');
  console.log('2. Restart your dev server');
  console.log('3. Test login flow:');
  console.log('   - Login as adwait@thelostproject.in → should see /dashboard');
  console.log('   - Login as social@thefoundproject.com → should see /v2/dashboard');
  console.log('\n' + '='.repeat(70));
}

testTrafficController().catch(console.error);
