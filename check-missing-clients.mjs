import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseServiceKey = 'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMissingClients() {
  // Get all users with role 'client'
  const { data: clientUsers } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'client');
  
  console.log(`Found ${clientUsers?.length || 0} users with role 'client'\n`);
  
  // Get all client records
  const { data: clientRecords } = await supabase
    .from('clients')
    .select('user_id, email, company_name');
  
  console.log(`Found ${clientRecords?.length || 0} client records\n`);
  
  // Find missing
  const clientRecordEmails = new Set(clientRecords?.map(c => c.email.toLowerCase()) || []);
  const missingClients = clientUsers?.filter(u => !clientRecordEmails.has(u.email.toLowerCase())) || [];
  
  console.log(`Missing client records: ${missingClients.length}\n`);
  
  if (missingClients.length > 0) {
    console.log('Users with role=client but NO client record:');
    missingClients.forEach(u => console.log(`  - ${u.email} (${u.id})`));
  }
}

checkMissingClients();
