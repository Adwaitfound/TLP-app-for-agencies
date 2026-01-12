import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const email = 'social@thefoundproject.com';

console.log(`🔍 Checking for existing user: ${email}\n`);

// Check auth.users
const { data: { users }, error } = await supabase.auth.admin.listUsers();

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

const existingUser = users.find(u => u.email === email);

if (existingUser) {
  console.log(`✅ User EXISTS in auth.users:`);
  console.log(`   ID: ${existingUser.id}`);
  console.log(`   Email: ${existingUser.email}`);
  console.log(`   Created: ${existingUser.created_at}`);
  console.log(`   Email Confirmed: ${existingUser.email_confirmed_at ? 'Yes' : 'No'}`);
  
  // Check if linked to organization
  const { data: membership } = await supabase
    .from('saas_organization_members')
    .select('*, saas_organizations(*)')
    .eq('user_id', existingUser.id)
    .single();
  
  if (membership) {
    console.log(`\n🏢 Already linked to organization:`);
    console.log(`   Org: ${membership.saas_organizations.name}`);
    console.log(`   Role: ${membership.role}`);
    console.log(`   Status: ${membership.status}`);
    console.log(`\n💡 User should just login at /agency/login`);
  } else {
    console.log(`\n⚠️  User exists but NOT linked to any organization`);
    console.log(`💡 The setup page should link this user to the organization`);
  }
} else {
  console.log(`❌ No user found with email: ${email}`);
  console.log(`💡 Setup page should create a NEW user`);
}
