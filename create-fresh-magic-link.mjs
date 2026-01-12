import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

console.log('🔗 Creating fresh magic link...\n');

// Get the organization
const { data: org } = await supabase
  .from('saas_organizations')
  .select('*')
  .eq('slug', 'the-found-project')
  .single();

if (!org) {
  console.error('❌ Organization not found');
  process.exit(1);
}

// Delete old magic links for this email
await supabase
  .from('saas_magic_links')
  .delete()
  .eq('email', 'social@thefoundproject.com');

console.log('🗑️  Deleted old magic links');

// Create new magic link
const { data: newLink, error } = await supabase
  .from('saas_magic_links')
  .insert({
    type: 'signup',
    email: 'social@thefoundproject.com',
    org_id: org.id,
    metadata: {
      role: 'admin',
      admin_name: 'Admin',
      agency_name: org.name,
    }
  })
  .select()
  .single();

if (error) {
  console.error('❌ Failed:', error);
  process.exit(1);
}

const setupUrl = `http://localhost:3001/v2/setup?token=${newLink.token}`;

console.log(`✅ New magic link created!`);
console.log(`   Token: ${newLink.token}`);
console.log(`   Expires: ${newLink.expires_at}`);
console.log(`\n🔗 Fresh Setup URL:`);
console.log(`   ${setupUrl}`);
console.log(`\n💡 This link will expire in 24 hours and is one-time use only.\n`);
