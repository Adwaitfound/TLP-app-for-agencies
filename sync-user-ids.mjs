import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseServiceKey = 'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function syncUserIds() {
  console.log('🔄 Syncing user IDs between auth.users and public.users...\n');

  // Get all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }

  // Get all public users
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('id, email');
  if (publicError) {
    console.error('❌ Error fetching public users:', publicError);
    return;
  }

  console.log(`Found ${authData.users.length} auth users`);
  console.log(`Found ${publicUsers.length} public users\n`);

  // Create a map of email -> auth user ID
  const emailToAuthId = new Map();
  authData.users.forEach(u => {
    emailToAuthId.set(u.email.toLowerCase(), u.id);
  });

  const updates = [];
  const mismatches = [];

  for (const user of publicUsers) {
    const authId = emailToAuthId.get(user.email.toLowerCase());
    
    if (!authId) {
      console.log(`⚠️  No auth user found for: ${user.email}`);
      continue;
    }

    if (user.id !== authId) {
      mismatches.push({ email: user.email, oldId: user.id, newId: authId });
      updates.push({ email: user.email, authId });
    }
  }

  console.log(`Found ${mismatches.length} mismatched IDs\n`);

  if (mismatches.length === 0) {
    console.log('✅ All user IDs are already in sync!');
    return;
  }

  console.log('Updating user IDs...\n');

  for (const { email, authId } of updates) {
    console.log(`Updating ${email}...`);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ id: authId })
      .eq('email', email);

    if (updateError) {
      console.error(`  ❌ Failed: ${updateError.message}`);
    } else {
      console.log(`  ✅ Updated`);
    }
  }

  console.log('\n✅ User ID sync complete!');
}

syncUserIds().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
