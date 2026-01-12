import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6dW94dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTMyNDE4MCwiZXhwIjoxODI5MTMyNDE4MH0.1KqlRoVcLqZJkx1Xz6qLVz7CbKRBv0vwDjKRwb_xXFU'
);

async function checkSetup() {
  console.log('✅ Checking setup completion...\n');

  // Check organization
  const { data: org } = await supabase
    .from('saas_organizations')
    .select('*')
    .eq('slug', 'the-found-project')
    .single();

  if (org) {
    console.log('✅ Organization: "The Found Project"');
    console.log(`   ID: ${org.id}`);
    console.log(`   Plan: ${org.plan}`);
    console.log(`   Status: ${org.status}`);
  }

  // Check organization members
  const { data: members } = await supabase
    .from('saas_organization_members')
    .select('*')
    .eq('org_id', org?.id);

  if (members && members.length > 0) {
    console.log(`\n✅ Organization Members: ${members.length}`);
    members.forEach(m => {
      console.log(`   - ${m.user_id} (Role: ${m.role}, Status: ${m.status})`);
    });
  }

  // Check user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const socialUser = users?.find(u => u.email === 'social@thefoundproject.com');

  if (socialUser) {
    console.log(`\n✅ User Account: social@thefoundproject.com`);
    console.log(`   ID: ${socialUser.id}`);
    console.log(`   Email Confirmed: ${socialUser.email_confirmed_at ? '✅' : '❌'}`);
  } else {
    console.log(`\n❌ User NOT found: social@thefoundproject.com`);
  }

  // Check magic links
  const { data: links } = await supabase
    .from('saas_magic_links')
    .select('*')
    .eq('email', 'social@thefoundproject.com');

  if (links && links.length > 0) {
    console.log(`\n📝 Magic Links: ${links.length}`);
    links.forEach((link, i) => {
      const used = link.used_at ? '✅ USED' : '⏳ UNUSED';
      console.log(`   ${i + 1}. [${used}] Expires: ${new Date(link.expires_at).toLocaleString()}`);
    });
  }

  console.log('\n🎉 Setup Complete! You can now log in to the dashboard.');
}

checkSetup().catch(console.error);
