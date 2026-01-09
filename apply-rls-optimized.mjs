#!/usr/bin/env node

/**
 * Apply RLS optimizations via Supabase Management API
 * Run: node apply-rls-optimized.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6cXVveHZxaHhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDIwMzA3MiwiZXhwIjoyMDQ5Nzc5MDcyfQ.kJaUiD7kZd1FJD43SXAhC9jR88JyW1AwiFOjcQ7tEPU';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('╔════════════════════════════════════════════════════╗');
console.log('║   Applying RLS Optimizations to Supabase          ║');
console.log('╚════════════════════════════════════════════════════╝\n');

const sqlFile = join(__dirname, 'RLS_FIX_COMMENTS_SUPER_ADMIN_OPTIMIZED.sql');
const sql = readFileSync(sqlFile, 'utf-8');

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`📄 Loaded ${statements.length} SQL statements from file\n`);

console.log('⚠️  IMPORTANT: JavaScript client cannot execute DDL statements.');
console.log('   Please apply the SQL manually via Supabase Dashboard:\n');
console.log('   🔗 https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql/new\n');
console.log('📋 Copy the SQL from: RLS_FIX_COMMENTS_SUPER_ADMIN_OPTIMIZED.sql\n');

// Alternative: Show how to use psql if they have it configured
console.log('Alternative: If you have psql configured with direct DB access:');
console.log('   psql "postgresql://postgres:[YOUR_DB_PASSWORD]@db.frinqtylwgzquoxvqhxb.supabase.co:5432/postgres" < RLS_FIX_COMMENTS_SUPER_ADMIN_OPTIMIZED.sql');
console.log('\n   Get your DB password from: Supabase Dashboard → Settings → Database\n');
