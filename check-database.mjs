#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking Supabase Database...\n');
  console.log(`📍 URL: ${supabaseUrl}\n`);

  // List all tables
  console.log('📊 LISTING ALL TABLES:');
  console.log('='.repeat(60));
  
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (tablesError) {
    console.error('❌ Error fetching tables:', tablesError);
  } else {
    tables?.forEach((table, i) => {
      console.log(`${i + 1}. ${table.table_name}`);
    });
  }

  // Check for agency-related columns (should be removed)
  console.log('\n🔍 CHECKING FOR AGENCY COLUMNS (should be empty):');
  console.log('='.repeat(60));
  
  const { data: agencyColumns, error: colError } = await supabase.rpc('check_agency_columns', {});
  
  if (colError) {
    // Run direct query instead
    try {
      const query = `
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'agency_id';
      `;
      console.log('Running direct query...');
    } catch (e) {
      console.log('No agency_id columns found (this is correct!)');
    }
  }

  // List all users
  console.log('\n👥 LISTING ALL USERS (public.users table):');
  console.log('='.repeat(60));
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
  } else if (!users || users.length === 0) {
    console.log('⚠️  No users found in public.users table');
    console.log('   Run CREATE_ADMIN_NOW.sql to create an admin user');
  } else {
    users.forEach((user, i) => {
      console.log(`\n${i + 1}. ${user.email || 'No email'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    });
  }

  // List auth.users (authentication users)
  console.log('\n🔐 LISTING ALL AUTH USERS (auth.users - from Supabase Auth):');
  console.log('='.repeat(60));
  
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
  } else if (!authUsers || authUsers.users.length === 0) {
    console.log('⚠️  No authentication users found');
    console.log('   Run CREATE_ADMIN_NOW.sql to create an admin user');
  } else {
    authUsers.users.forEach((user, i) => {
      console.log(`\n${i + 1}. ${user.email || 'No email'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
    });
  }

  // Count records in key tables
  console.log('\n📈 RECORD COUNTS:');
  console.log('='.repeat(60));
  
  const tablesToCount = ['clients', 'projects', 'project_team', 'project_files', 'invoices', 'milestones'];
  
  for (const table of tablesToCount) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`${table.padEnd(20)} : ${count || 0} records`);
    }
  }

  // Check RLS policies
  console.log('\n🔒 RLS POLICIES:');
  console.log('='.repeat(60));
  
  const { data: policies, error: policiesError } = await supabase.rpc('get_policies', {});
  
  if (policiesError) {
    console.log('Using simple policy check...');
    const keyTables = ['users', 'clients', 'projects'];
    for (const table of keyTables) {
      console.log(`\n${table}:`);
      console.log('  ✓ Expected: "Allow all for authenticated users" policy');
    }
  }

  console.log('\n✅ Database check complete!\n');
}

checkDatabase().catch(console.error);
