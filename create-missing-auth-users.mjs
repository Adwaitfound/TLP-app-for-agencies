import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseServiceKey = 'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createMissingAuthUsers() {
  console.log('🔍 Finding users that need auth accounts...\n');

  // Get all users from public.users
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('id, email, role');

  if (publicError) {
    console.error('❌ Error fetching public users:', publicError);
    return;
  }

  // Get all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }

  const authEmails = new Set(authData.users.map(u => u.email.toLowerCase()));
  const missingUsers = publicUsers.filter(u => !authEmails.has(u.email.toLowerCase()));

  console.log(`Found ${missingUsers.length} users without auth accounts:\n`);
  
  if (missingUsers.length === 0) {
    console.log('✅ All users already have auth accounts!');
    return;
  }

  const results = [];

  for (const user of missingUsers) {
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!1';
    
    console.log(`Creating auth user for: ${user.email}`);
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: user.role
      }
    });

    if (createError) {
      console.error(`  ❌ Failed: ${createError.message}`);
      results.push({ email: user.email, success: false, error: createError.message });
    } else {
      console.log(`  ✅ Created with ID: ${newUser.user.id}`);
      results.push({ 
        email: user.email, 
        success: true, 
        userId: newUser.user.id,
        password: tempPassword 
      });

      // Update the user ID in public.users to match auth.users
      const { error: updateError } = await supabase
        .from('users')
        .update({ id: newUser.user.id })
        .eq('email', user.email);

      if (updateError) {
        console.log(`  ⚠️  Warning: Could not update user ID in public.users`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successfully created: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n📧 TEMPORARY PASSWORDS (save these!):');
    console.log('='.repeat(80));
    successful.forEach(r => {
      console.log(`${r.email}`);
      console.log(`  Password: ${r.password}`);
      console.log(`  User ID: ${r.userId}\n`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ FAILED TO CREATE:');
    failed.forEach(r => {
      console.log(`  ${r.email}: ${r.error}`);
    });
  }
}

createMissingAuthUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
