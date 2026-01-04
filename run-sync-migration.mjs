import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseServiceKey = 'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🔄 Running user ID sync migration...\n');

  // Step 1: Update clients table
  console.log('Step 1: Updating clients.user_id...');
  const { error: clientsError } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE clients c
      SET user_id = (
        SELECT id FROM auth.users WHERE email = c.email LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM auth.users WHERE email = c.email AND id != c.user_id
      );
    `
  });

  if (clientsError) {
    console.log('  Using direct update instead...');
    
    // Get all clients and auth users
    const { data: clients } = await supabase.from('clients').select('id, email, user_id');
    const { data: authData } = await supabase.auth.admin.listUsers();
    
    const emailToAuthId = new Map();
    authData.users.forEach(u => emailToAuthId.set(u.email.toLowerCase(), u.id));
    
    for (const client of clients) {
      const authId = emailToAuthId.get(client.email.toLowerCase());
      if (authId && authId !== client.user_id) {
        console.log(`  Updating client ${client.email}...`);
        await supabase.from('clients').update({ user_id: authId }).eq('id', client.id);
      }
    }
  }
  
  console.log('  ✅ Clients updated\n');

  // Step 2: Update users table  
  console.log('Step 2: Updating users.id...');
  
  const { data: users } = await supabase.from('users').select('id, email');
  const { data: authData } = await supabase.auth.admin.listUsers();
  
  const emailToAuthId = new Map();
  authData.users.forEach(u => emailToAuthId.set(u.email.toLowerCase(), u.id));
  
  // Delete old users and insert with correct IDs
  for (const user of users) {
    const authId = emailToAuthId.get(user.email.toLowerCase());
    if (authId && authId !== user.id) {
      console.log(`  Syncing user ${user.email}...`);
      
      // Get the full user data
      const { data: fullUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();
      
      // Delete old record
      await supabase.from('users').delete().eq('email', user.email);
      
      // Insert with correct ID
      await supabase.from('users').insert({
        ...fullUser,
        id: authId
      });
    }
  }
  
  console.log('  ✅ Users updated\n');
  console.log('✅ Migration complete!');
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
