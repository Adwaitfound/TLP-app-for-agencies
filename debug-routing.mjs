import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

async function debugRoutingLogic() {
  console.log('🔍 DEBUGGING ROUTING LOGIC\n');
  console.log('===========================\n');

  const userId = '03b42c20-3205-412b-8f0b-90fab223a7b1';
  const email = 'social@thefoundproject.com';

  // Check 1: Is user in saas_organization_members?
  console.log('CHECK 1️⃣: SaaS Organization Membership');
  console.log('-------------------------------------');
  const { data: membership, error: membershipError } = await supabase
    .from('saas_organization_members')
    .select('org_id, status, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (membershipError) {
    console.log(`❌ Error: ${membershipError.message}`);
    console.log(`   Code: ${membershipError.code}`);
  } else {
    console.log(`✅ SaaS Membership Found:`);
    console.log(`   org_id: ${membership.org_id}`);
    console.log(`   role: ${membership.role}`);
    console.log(`   status: ${membership.status}`);
  }

  // Check 2: Is user in old users table?
  console.log('\nCHECK 2️⃣: Old Users Table (Agency Owner)');
  console.log('------------------------------------------');
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('role, email, id')
    .eq('id', userId)
    .single();

  if (userDataError) {
    console.log(`❌ Error: ${userDataError.message}`);
  } else {
    console.log(`✅ User Found in users table:`);
    console.log(`   email: ${userData.email}`);
    console.log(`   role: ${userData.role}`);
    console.log(`   is agency owner: ${userData.role === 'admin' || userData.role === 'agency_admin'}`);
  }

  // Check 3: What should the routing be?
  console.log('\n📍 ROUTING DECISION');
  console.log('-------------------');

  const isSaaSUser = !membershipError && membership?.org_id;
  const isOldAgencyOwner = !userDataError && (userData?.role === 'admin' || userData?.role === 'agency_admin');
  const isNewUser = !isSaaSUser && !isOldAgencyOwner;

  if (isSaaSUser) {
    console.log(`🎯 User Type: NEW SAAS USER`);
    console.log(`   → Should redirect to: /v2/dashboard`);
    console.log(`   → Data source: saas_* tables (filtered by org_id: ${membership.org_id})`);
    console.log(`   → Organization: See saas_organizations table for this org_id`);
  } else if (isOldAgencyOwner) {
    console.log(`🎯 User Type: OLD AGENCY OWNER`);
    console.log(`   → Should redirect to: /dashboard`);
    console.log(`   → Data source: Original tables (clients, projects, etc.)`);
    console.log(`   → Role: ${userData.role}`);
  } else if (isNewUser) {
    console.log(`🎯 User Type: NEW USER (NO ORG)`);
    console.log(`   → Should redirect to: /agency-onboarding`);
    console.log(`   → Action: Show "Create Your First Agency" screen`);
  }

  // Check 4: What's currently happening?
  console.log('\n⚠️ CURRENT ISSUE');
  console.log('----------------');

  if (isSaaSUser) {
    console.log(`User IS a SaaS member but:
1. Login page query might be failing silently
2. OR RLS policies are blocking the membership query  
3. OR router.push("/v2/dashboard") isn't working

Solution: Middleware will enforce routing regardless of login page logic`);
  }

  // Check 5: Are RLS policies applied?
  console.log('\n🔐 RLS POLICIES CHECK');
  console.log('---------------------');
  
  try {
    // Try to query as service role (should always work)
    const { count: memberCount, error: countError } = await supabase
      .from('saas_organization_members')
      .select('*', { count: 'exact' })
      .limit(1);

    if (countError) {
      console.log(`❌ Even service role query failed: ${countError.message}`);
    } else {
      console.log(`✅ Service role can query saas_organization_members (${memberCount} total records)`);
      console.log(`   → RLS policies ARE applied and working`);
    }
  } catch (e) {
    console.log(`⚠️ Connection error: ${e.message}`);
  }

  // Check 6: Organization details
  console.log('\n🏢 ORGANIZATION DETAILS');
  console.log('-----------------------');

  if (isSaaSUser) {
    const { data: org, error: orgError } = await supabase
      .from('saas_organizations')
      .select('id, name, slug, plan, status')
      .eq('id', membership.org_id)
      .single();

    if (orgError) {
      console.log(`❌ Could not fetch organization: ${orgError.message}`);
    } else {
      console.log(`✅ Organization:`);
      console.log(`   name: ${org.name}`);
      console.log(`   slug: ${org.slug}`);
      console.log(`   plan: ${org.plan}`);
      console.log(`   status: ${org.status}`);
    }
  }

  console.log('\n===========================');
  console.log('END OF DEBUG REPORT\n');
}

debugRoutingLogic().catch(console.error);
