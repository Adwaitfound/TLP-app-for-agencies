#!/usr/bin/env node
/**
 * Verify SAAS Database Tables
 * Run this after executing saas_business_tables.sql
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTables() {
  console.log('🔍 Verifying SAAS Business Tables...\n');
  
  const tables = [
    'saas_clients',
    'saas_client_services',
    'saas_projects', 
    'saas_project_files',
    'saas_project_comments',
    'saas_milestones',
    'saas_project_team',
    'saas_sub_projects',
    'saas_sub_project_comments',
    'saas_sub_project_updates',
    'saas_invoices',
    'saas_invoice_items'
  ];
  
  let allGood = true;
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count').limit(1);
    if (error) {
      console.log('❌', table.padEnd(30), '- NOT FOUND');
      allGood = false;
    } else {
      console.log('✅', table.padEnd(30), '- Created successfully');
    }
  }
  
  if (allGood) {
    console.log('\n✨ All 12 saas_ business tables are ready!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start migrating pages (see V2_MIGRATION_GUIDE.md)');
    console.log('   2. Begin with Projects page: app/v2/projects/page.tsx');
    console.log('   3. Use MIGRATION_QUICK_REF.md for query patterns');
  } else {
    console.log('\n⚠️  Some tables are missing. Please run saas_business_tables.sql in Supabase SQL Editor');
  }
}

verifyTables().catch(console.error);
