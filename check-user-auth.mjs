import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

async function checkUser() {
  console.log('🔍 Checking user info...\n');
  
  const userId = '03b42c20-3205-412b-8f0b-90fab223a7b1';
  
  // Check if user is in auth.users
  const { data } = await supabase.auth.admin.listUsers();
  const users = data?.users || [];
  const authUser = users.find(u => u.id === userId);
  
  if (authUser) {
    console.log('✅ Auth User Found:');
    console.log('  Email:', authUser.email);
    console.log('  ID:', authUser.id);
    console.log('  Email confirmed:', authUser.email_confirmed_at ? '✅' : '❌');
    console.log('  Last sign in:', authUser.last_sign_in_at);
  } else {
    console.log('❌ Auth User NOT found');
    console.log('   User ID:', userId);
  }
  
  console.log('\n📋 All auth users:');
  users.forEach(u => {
    console.log(`  - ${u.email} (${u.id})`);
  });
  
  // Check users table
  console.log('\n📋 Users table records:');
  const { data: userRecords } = await supabase
    .from('users')
    .select('*');
  
  userRecords.forEach(u => {
    console.log(`  - ${u.email} (${u.id}) - Role: ${u.role}`);
  });
  
  // Check if the user_id from org_members exists
  const userFromTable = userRecords.find(u => u.id === userId);
  if (userFromTable) {
    console.log('\n✅ User from org_members found in users table');
  } else {
    console.log('\n❌ User from org_members NOT found in users table');
  }
}

checkUser().catch(console.error);
