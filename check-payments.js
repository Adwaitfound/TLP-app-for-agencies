const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkPayments() {
  console.log('🔍 Checking payment records...\n');
  
  // Check payments
  const { data: payments, error } = await supabase
    .from('saas_organization_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  if (!payments || payments.length === 0) {
    console.log('📊 No payments found yet.\n');
    console.log('Try making a test payment first!\n');
    return;
  }
  
  console.log(`📊 Found ${payments.length} payment(s):\n`);
  payments.forEach((p, i) => {
    console.log(`${i + 1}. Payment:`);
    console.log(`   Order ID: ${p.razorpay_order_id}`);
    console.log(`   Plan: ${p.plan_type}`);
    console.log(`   Amount: ₹${p.amount}`);
    console.log(`   Status: ${p.status}`);
    console.log(`   Org ID: ${p.org_id || '(pending webhook)'}`);
    console.log(`   Created: ${new Date(p.created_at).toLocaleString()}`);
    console.log('');
  });
  
  // Check organizations
  const { data: orgs } = await supabase
    .from('saas_organizations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (orgs && orgs.length > 0) {
    console.log(`\n🏢 Found ${orgs.length} organization(s):\n`);
    orgs.forEach((org, i) => {
      console.log(`${i + 1}. ${org.name}`);
      console.log(`   Plan: ${org.plan}`);
      console.log(`   Status: ${org.status}`);
      console.log(`   Created: ${new Date(org.created_at).toLocaleString()}`);
      console.log('');
    });
  }
  
  // Check magic links
  const { data: links } = await supabase
    .from('saas_magic_links')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (links && links.length > 0) {
    console.log(`\n🔗 Found ${links.length} magic link(s):\n`);
    links.forEach((link, i) => {
      console.log(`${i + 1}. Email: ${link.email}`);
      console.log(`   Type: ${link.type}`);
      console.log(`   Used: ${link.used_at ? 'Yes' : 'No'}`);
      console.log(`   Expires: ${new Date(link.expires_at).toLocaleString()}`);
      if (!link.used_at) {
        console.log(`   🔑 Link: http://localhost:3001/v2/setup?token=${link.token}`);
      }
      console.log('');
    });
  }
}

checkPayments();
