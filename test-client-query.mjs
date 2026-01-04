import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseServiceKey = 'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user ID from the error
const testUserId = '4be9af50-ce07-4f32-9f08-9b2ecfd14c3c'; // avani@thelostproject.in

async function testClientQuery() {
  console.log('Testing client query for user:', testUserId);
  
  const { data, error } = await supabase
    .from('clients')
    .select('id,user_id,company_name,email,status')
    .eq('user_id', testUserId)
    .single();
  
  console.log('\nResult:', { data, error });
  
  // Also check all clients
  console.log('\nAll clients with this user_id:');
  const { data: all } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', testUserId);
  
  console.log(all);
  
  // Check by email
  console.log('\nClient by email (avani@thelostproject.in):');
  const { data: byEmail } = await supabase
    .from('clients')
    .select('*')
    .eq('email', 'avani@thelostproject.in');
  
  console.log(byEmail);
}

testClientQuery();
