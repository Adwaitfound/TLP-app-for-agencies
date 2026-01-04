#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('\n=== USERS IN public.users TABLE ===');
  const { data: publicUsers, error: err1 } = await supabase
    .from('users')
    .select('id, email, name, role')
    .order('created_at', { ascending: false });

  if (err1) {
    console.error('Error:', err1);
  } else {
    console.log(`Found ${publicUsers?.length || 0} users:`);
    publicUsers?.forEach(u => {
      console.log(`  - ${u.email} (${u.role})`);
    });
  }

  console.log('\n=== USERS IN auth.users (Supabase Auth) ===');
  const { data: authData, error: err2 } = await supabase.auth.admin.listUsers();

  if (err2) {
    console.error('Error:', err2);
  } else {
    console.log(`Found ${authData?.users?.length || 0} auth users:`);
    authData?.users?.forEach(u => {
      console.log(`  - ${u.email}`);
    });
  }

  console.log('\n=== MISMATCH CHECK ===');
  const publicEmails = new Set(publicUsers?.map(u => u.email) || []);
  const authEmails = new Set(authData?.users?.map(u => u.email) || []);

  const missingInAuth = [...publicEmails].filter(e => !authEmails.has(e));
  const missingInPublic = [...authEmails].filter(e => !publicEmails.has(e));

  if (missingInAuth.length > 0) {
    console.log('\nUsers in public.users but NOT in auth.users:');
    missingInAuth.forEach(e => console.log(`  ✗ ${e}`));
  }

  if (missingInPublic.length > 0) {
    console.log('\nUsers in auth.users but NOT in public.users:');
    missingInPublic.forEach(e => console.log(`  ✗ ${e}`));
  }

  if (missingInAuth.length === 0 && missingInPublic.length === 0) {
    console.log('\n✓ All users are in sync!');
  }
}

check().catch(console.error);
