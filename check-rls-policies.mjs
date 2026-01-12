import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz'
);

async function checkRLS() {
  console.log('🔍 Checking RLS policies...\n');
  
  // Get RLS policies from Supabase
  const { data, error } = await supabase.rpc('get_rls_policies', {
    table_name: 'saas_organization_members'
  }).catch(() => ({ data: null, error: 'Function not available' }));
  
  if (error) {
    console.log('Could not fetch RLS policies via RPC');
    console.log('Let me check if user can query their own membership directly...\n');
    
    // Try with anon key to simulate client-side query
    const anonSupabase = createClient(
      'https://frinqtylwgzquoxvqhxb.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6cXVveHZxaHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MzM3MTMsImV4cCI6MjA4MTMwOTcxM30.OH2LsFhlo-TpFc42IIWKOTh06sD07CkAYnF1bknyE_Y'
    );
    
    // Set the user context
    await anonSupabase.auth.signInWithPassword({
      email: 'social@thefoundproject.com',
      password: 'TestPassword@123' // This won't work but we're just testing
    }).catch(() => {});
    
    const { data: members, error: memberError } = await anonSupabase
      .from('saas_organization_members')
      .select('*')
      .limit(1);
    
    if (memberError) {
      console.log('❌ Error fetching with anon key:', memberError.message);
    } else {
      console.log('✅ Can fetch with anon key:', members);
    }
  }
}

checkRLS().catch(console.error);
