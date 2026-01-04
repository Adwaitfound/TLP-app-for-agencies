#!/usr/bin/env node

/**
 * Supabase SQL Direct Executor
 * Uses a stored procedure to execute arbitrary SQL
 */

const fs = require('fs');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('❌ Usage: node execute-sql-direct.js <sql-file>');
  process.exit(1);
}

const sqlPath = path.resolve(sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ File not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf-8');

console.log('📋 SQL File:', path.basename(sqlPath));
console.log('🔗 Supabase URL:', SUPABASE_URL);
console.log('\n---\n');

// Parse PostgreSQL connection string from Supabase URL
const url = new URL(SUPABASE_URL);
const projectId = url.hostname.split('.')[0];

console.log(`ℹ️  Project ID: ${projectId}`);
console.log(`\nTo execute this SQL, please use one of these methods:\n`);

console.log('📌 Option 1: Supabase Dashboard (Easiest)');
console.log(`1. Open: https://supabase.com/dashboard/project/${projectId}/sql/new`);
console.log(`2. Paste the SQL from: ${path.relative(process.cwd(), sqlPath)}`);
console.log(`3. Click "Run"\n`);

console.log('📌 Option 2: Supabase CLI (Requires Authentication)');
console.log(`supabase db push\n`);

console.log('📌 Option 3: Docker PostgreSQL Client');
console.log('docker run --rm -it postgres:latest psql "postgresql://..."');
console.log('(Then paste the SQL)\n');

console.log('SQL Preview:');
console.log('---');
console.log(sql.substring(0, 300) + (sql.length > 300 ? '\n...' : ''));
console.log('---\n');

console.log('✅ SQL file is ready to execute');
