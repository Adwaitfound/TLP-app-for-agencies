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

async function checkUsersAndClients() {
  console.log('🔍 Checking Users and Clients Data...\n');
  
  // Get all auth users with their public.users and clients status
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }

  // Get all public.users
  const { data: publicUsers, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, role');
  
  if (usersError) {
    console.log('⚠️  Error fetching public.users:', usersError.message);
  }

  // Get all clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, user_id, email, company_name, contact_person, status');
  
  if (clientsError) {
    console.error('❌ Error fetching clients:', clientsError);
    return;
  }

  console.log('📊 ANALYSIS RESULTS:');
  console.log('='.repeat(80));
  console.log(`Total auth.users: ${authUsers.users.length}`);
  console.log(`Total public.users: ${publicUsers?.length || 0}`);
  console.log(`Total clients: ${clients?.length || 0}\n`);

  // Create lookup maps
  const publicUsersMap = new Map((publicUsers || []).map(u => [u.id, u]));
  const clientsMap = new Map((clients || []).map(c => [c.user_id, c]));

  console.log('🔍 DETAILED USER STATUS:');
  console.log('='.repeat(80));
  
  const missingPublicUsers = [];
  const missingClients = [];
  
  authUsers.users.forEach((authUser, i) => {
    const hasPublicUser = publicUsersMap.has(authUser.id);
    const hasClient = clientsMap.has(authUser.id);
    const publicUser = publicUsersMap.get(authUser.id);
    
    console.log(`\n${i + 1}. ${authUser.email}`);
    console.log(`   Auth ID: ${authUser.id}`);
    console.log(`   public.users: ${hasPublicUser ? '✅ EXISTS' : '❌ MISSING'}`);
    if (hasPublicUser) {
      console.log(`   - Role: ${publicUser.role || 'N/A'}`);
      console.log(`   - Name: ${publicUser.full_name || 'N/A'}`);
    }
    console.log(`   clients table: ${hasClient ? '✅ EXISTS' : '❌ MISSING'}`);
    if (hasClient) {
      const client = clientsMap.get(authUser.id);
      console.log(`   - Company: ${client.company_name || 'N/A'}`);
      console.log(`   - Status: ${client.status || 'N/A'}`);
    }
    
    if (!hasPublicUser) missingPublicUsers.push(authUser);
    if (!hasClient) missingClients.push(authUser);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(80));
  console.log(`Auth users missing from public.users: ${missingPublicUsers.length}`);
  console.log(`Auth users missing from clients: ${missingClients.length}`);
  
  if (missingClients.length > 0) {
    console.log('\n⚠️  Users NOT in clients table:');
    missingClients.forEach(u => {
      const publicUser = publicUsersMap.get(u.id);
      const role = publicUser?.role || 'unknown';
      console.log(`   - ${u.email} (role: ${role})`);
    });
  }

  console.log('\n✅ Analysis complete!');
}

checkUsersAndClients().catch(console.error);
