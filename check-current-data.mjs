#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentData() {
  console.log('🔍 Checking current database state...\n');
  
  const tables = ['clients', 'projects', 'invoices', 'invoice_items', 'milestones', 'project_files', 'project_team', 'users'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${table}: Error - ${error.message}`);
    } else {
      console.log(`📊 ${table}: ${count || 0} records`);
    }
  }
  
  // Check specific invoice data
  console.log('\n📄 Invoice details:');
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (invoices && invoices.length > 0) {
    invoices.forEach(inv => {
      console.log(`  - Invoice #${inv.invoice_number || inv.id}: ${inv.total_amount || 0} (${inv.status || 'N/A'})`);
    });
  } else {
    console.log('  ⚠️  No invoices found');
  }
}

checkCurrentData().catch(console.error);
