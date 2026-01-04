import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseServiceKey = 'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMissingClientRecords() {
  // Get all users with role 'client'
  const { data: clientUsers } = await supabase
    .from('users')
    .select('id, email')
    .eq('role', 'client');
  
  // Get existing client records
  const { data: existingClients } = await supabase
    .from('clients')
    .select('user_id, email');
  
  const existingEmails = new Set(existingClients?.map(c => c.email.toLowerCase()) || []);
  const missingClients = clientUsers?.filter(u => !existingEmails.has(u.email.toLowerCase())) || [];
  
  console.log(`Creating ${missingClients.length} missing client records...\n`);
  
  for (const user of missingClients) {
    // Extract company name from email (simple logic)
    const companyName = user.email.split('@')[0];
    const contactPerson = companyName.charAt(0).toUpperCase() + companyName.slice(1);
    
    console.log(`Creating client record for ${user.email}...`);
    
    const { error } = await supabase.from('clients').insert({
      user_id: user.id,
      email: user.email,
      company_name: companyName,
      contact_person: contactPerson,
      status: 'active',
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    } else {
      console.log(`  ✅ Created`);
    }
  }
  
  console.log('\n✅ All client records created!');
}

createMissingClientRecords();
