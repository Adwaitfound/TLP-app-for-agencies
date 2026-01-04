#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local file
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateMissingRecords() {
  console.log('🔄 Populating missing users and clients...\n');
  
  // Step 1: Create public.users records for missing auth users
  console.log('Step 1: Creating missing public.users records...');
  
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: publicUsers } = await supabase.from('users').select('id');
  
  const publicUserIds = new Set((publicUsers || []).map(u => u.id));
  const missingUsers = authUsers.users.filter(au => !publicUserIds.has(au.id));
  
  console.log(`Found ${missingUsers.length} users missing from public.users`);
  
  for (const authUser of missingUsers) {
    const fullName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
    const role = authUser.user_metadata?.role || 'client';
    
    const { error } = await supabase.from('users').insert({
      id: authUser.id,
      email: authUser.email,
      full_name: fullName,
      role: role,
      status: 'approved',
      created_at: authUser.created_at,
      updated_at: new Date().toISOString()
    });
    
    if (error) {
      console.log(`  ⚠️  Error creating user ${authUser.email}:`, error.message);
    } else {
      console.log(`  ✅ Created public.users record for ${authUser.email}`);
    }
  }
  
  // Step 2: Create clients records for users with role='client'
  console.log('\nStep 2: Creating missing clients records...');
  
  const { data: allPublicUsers } = await supabase.from('users').select('*');
  const { data: clients } = await supabase.from('clients').select('user_id');
  
  const clientUserIds = new Set((clients || []).map(c => c.user_id));
  const missingClients = (allPublicUsers || []).filter(u => 
    u.role === 'client' && !clientUserIds.has(u.id)
  );
  
  console.log(`Found ${missingClients.length} client users missing from clients table`);
  
  for (const user of missingClients) {
    const companyName = user.email.split('@')[0] || 'Unknown Company';
    
    const { error } = await supabase.from('clients').insert({
      user_id: user.id,
      email: user.email,
      company_name: companyName,
      contact_person: user.full_name || user.email.split('@')[0],
      status: 'active',
      total_projects: 0,
      total_revenue: 0
    });
    
    if (error) {
      console.log(`  ⚠️  Error creating client ${user.email}:`, error.message);
    } else {
      console.log(`  ✅ Created clients record for ${user.email}`);
    }
  }
  
  // Verification
  console.log('\n📊 VERIFICATION:');
  console.log('='.repeat(60));
  
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: clientCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  
  console.log(`Total public.users: ${userCount}`);
  console.log(`Total clients: ${clientCount}`);
  
  console.log('\n✅ All missing records populated!');
  console.log('🔄 Refresh your browser to see the updated client list.');
}

populateMissingRecords().catch(console.error);
