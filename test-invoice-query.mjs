import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseServiceKey = 'sb_secret_4QHrB2jggFwYxZK_ozrlcA_DNKv1_Qz';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6cXVveHZxaHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MzM3MTMsImV4cCI6MjA4MTMwOTcxM30.OH2LsFhlo-TpFc42IIWKOTh06sD07CkAYnF1bknyE_Y';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Test with avani's client ID
async function testInvoiceQuery() {
  // First get the client record
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, user_id, email')
    .eq('email', 'avani@thelostproject.in')
    .single();
  
  console.log('Client:', client);
  
  if (!client) {
    console.log('No client found!');
    return;
  }
  
  // Check all invoices for this client
  console.log('\nAll invoices for this client (admin):');
  const { data: allInvoices, error: allError } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('client_id', client.id);
  
  console.log('Result:', { count: allInvoices?.length || 0, error: allError });
  if (allInvoices && allInvoices.length > 0) {
    console.log('Sample:', allInvoices[0]);
  }
  
  // Check invoices table structure
  console.log('\nChecking if client_id column exists:');
  const { data: sampleInvoice } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .limit(1)
    .single();
  
  if (sampleInvoice) {
    console.log('Invoice columns:', Object.keys(sampleInvoice));
  }
}

testInvoiceQuery();
