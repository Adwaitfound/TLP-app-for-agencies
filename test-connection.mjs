import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseServiceKey = 'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz';

console.log('Testing connection to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function test() {
  console.log('\n1. Testing auth.admin.listUsers()...');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Auth error:', authError.message);
  } else {
    console.log(`✅ Found ${authData.users.length} auth users`);
    authData.users.forEach(u => console.log(`   - ${u.email}`));
  }

  console.log('\n2. Testing query on public.users...');
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('*');
  
  if (publicError) {
    console.error('❌ Query error:', publicError.message);
  } else {
    console.log(`✅ Found ${publicUsers?.length || 0} users in public.users`);
    publicUsers?.forEach(u => console.log(`   - ${u.email} (${u.role || 'no role'})`));
  }

  console.log('\n3. Testing query on clients...');
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, email, company_name');
  
  if (clientsError) {
    console.error('❌ Query error:', clientsError.message);
  } else {
    console.log(`✅ Found ${clients?.length || 0} clients`);
    clients?.forEach(c => console.log(`   - ${c.email} (${c.company_name})`));
  }
}

test().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
