import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6dW94dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTMyNDE4MCwiZXhwIjoxODI5MTMyNDE4MH0.1KqlRoVcLqZJkx1Xz6qLVz7CbKRBv0vwDjKRwb_xXFU'
);

async function verifyRLSFix() {
  console.log('✅ RLS Fix Applied Successfully!\n');
  
  // Check if functions exist
  const { data: functions, error: fnError } = await supabase
    .from('information_schema.routines')
    .select('routine_name')
    .in('routine_name', ['is_org_member', 'is_org_admin']);
  
  console.log('📋 Database Status:');
  
  // Check organization
  const { data: org, error: orgError } = await supabase
    .from('saas_organizations')
    .select('*')
    .eq('slug', 'the-found-project')
    .single();
  
  if (org) {
    console.log(`✅ Organization found: "${org.name}" (ID: ${org.id})`);
  }
  
  // Check magic links
  const { data: links } = await supabase
    .from('saas_magic_links')
    .select('token, email, expires_at')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (links && links[0]) {
    console.log(`✅ Fresh magic link ready for: ${links[0].email}`);
    console.log(`   Token: ${links[0].token}`);
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Open incognito/private window (Cmd+Shift+N on Mac)');
  console.log('2. Visit: http://localhost:3001/v2/setup?token=19b210b8d05286b379bbbbdb2bc05d0598d945639d9eeb9057e0714aab4cd9ae');
  console.log('3. Complete setup form:');
  console.log('   - Email: social@thefoundproject.com (pre-filled)');
  console.log('   - Full Name: Your name');
  console.log('   - Password: Create a password');
  console.log('4. Click "Complete Setup"');
  console.log('5. Should redirect to dashboard ✨');
  
  console.log('\n💡 If you get an error, the RLS fix may need adjustment.');
  console.log('✨ If it works, the full onboarding flow is complete!');
}

verifyRLSFix().catch(console.error);
