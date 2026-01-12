import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

async function checkAll() {
  console.log('🔍 Checking complete setup status...\n');

  // Check organization
  const { data: org } = await supabase
    .from('saas_organizations')
    .select('*')
    .eq('slug', 'the-found-project')
    .single();

  console.log('Organization:');
  console.log('  ID:', org?.id);
  console.log('  Name:', org?.name);
  console.log('  Status:', org?.status);

  // Check members
  if (org?.id) {
    const { data: members } = await supabase
      .from('saas_organization_members')
      .select('*')
      .eq('org_id', org.id);

    console.log(`\nOrganization Members: ${members?.length || 0}`);
    if (members && members.length > 0) {
      members.forEach(m => {
        console.log(`  - User: ${m.user_id}`);
        console.log(`    Role: ${m.role}`);
        console.log(`    Status: ${m.status}`);
      });
    }
  }

  // Check all users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  console.log(`\nAll Auth Users: ${users?.length || 0}`);
  users?.forEach(u => {
    console.log(`  - ${u.email} (ID: ${u.id}, Confirmed: ${u.email_confirmed_at ? '✅' : '❌'})`);
  });

  // Check users table
  const { data: userRecords } = await supabase
    .from('users')
    .select('*');

  console.log(`\nUsers Table Records: ${userRecords?.length || 0}`);
  userRecords?.forEach(u => {
    console.log(`  - ${u.email} (ID: ${u.id}, Role: ${u.role})`);
  });
}

checkAll().catch(console.error);
