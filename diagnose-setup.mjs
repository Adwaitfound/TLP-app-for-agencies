import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6dW94dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTMyNDE4MCwiZXhwIjoxODI5MTMyNDE4MH0.1KqlRoVcLqZJkx1Xz6qLVz7CbKRBv0vwDjKRwb_xXFU'
);

async function diagnose() {
  console.log('🔍 Diagnosing Setup Issue...\n');

  // Check old magic link status
  const { data: oldLinks } = await supabase
    .from('saas_magic_links')
    .select('token, email, used_at, expires_at')
    .eq('email', 'social@thefoundproject.com')
    .order('created_at', { ascending: false });

  console.log('📋 Magic Links for social@thefoundproject.com:');
  if (oldLinks && oldLinks.length > 0) {
    oldLinks.forEach((link, i) => {
      const isUsed = link.used_at ? '✅ USED' : '⏳ UNUSED';
      const isExpired = new Date(link.expires_at) < new Date() ? '❌ EXPIRED' : '✅ VALID';
      console.log(`  ${i + 1}. ${link.token.substring(0, 16)}... [${isUsed}] [${isExpired}]`);
    });
  }

  // Check organization
  const { data: org } = await supabase
    .from('saas_organizations')
    .select('id, name, slug')
    .eq('slug', 'the-found-project')
    .single();

  if (org) {
    console.log(`\n✅ Organization: "${org.name}" (${org.id})`);
  }

  // Check if user exists
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const socialUser = users?.find(u => u.email === 'social@thefoundproject.com');
  
  if (socialUser) {
    console.log(`✅ User Account Exists: ${socialUser.email}`);
    console.log(`   ID: ${socialUser.id}`);
    
    // Check membership
    if (org) {
      const { data: member } = await supabase
        .from('saas_organization_members')
        .select('role, status')
        .eq('org_id', org.id)
        .eq('user_id', socialUser.id)
        .single();
      
      if (member) {
        console.log(`   Org Role: ${member.role} [${member.status}] ✅`);
      }
    }
  } else {
    console.log(`❌ User Account NOT Created Yet`);
  }

  console.log('\n🔧 Solution:');
  if (oldLinks && oldLinks[0]?.used_at) {
    console.log('The magic link has already been used!');
    console.log('Creating a fresh magic link...\n');

    // Create fresh magic link
    const token = require('crypto').randomBytes(32).toString('hex');
    const { data: newLink, error } = await supabase
      .from('saas_magic_links')
      .insert({
        type: 'signup',
        email: 'social@thefoundproject.com',
        org_id: org?.id || null,
        token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single();

    if (newLink) {
      console.log('✅ Fresh magic link created!');
      console.log(`\n📝 New Setup Link:`);
      console.log(`http://localhost:3001/v2/setup?token=${token}`);
      console.log('\nUse this link in a NEW incognito window.');
    } else {
      console.log('Error creating link:', error?.message);
    }
  } else if (oldLinks && oldLinks[0]?.expires_at && new Date(oldLinks[0].expires_at) < new Date()) {
    console.log('The magic link has expired!');
    console.log('Creating a fresh one...\n');
    
    // Create fresh link (similar to above)
    const token = require('crypto').randomBytes(32).toString('hex');
    const { data: newLink } = await supabase
      .from('saas_magic_links')
      .insert({
        type: 'signup',
        email: 'social@thefoundproject.com',
        org_id: org?.id || null,
        token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single();

    if (newLink) {
      console.log('✅ Fresh magic link created!');
      console.log(`\n📝 New Setup Link:`);
      console.log(`http://localhost:3001/v2/setup?token=${token}`);
    }
  } else {
    console.log('Magic link should be valid. Check browser console for errors.');
  }
}

diagnose().catch(console.error);
