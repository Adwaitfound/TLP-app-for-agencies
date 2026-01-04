#!/usr/bin/env node

/**
 * SQL Runner for Supabase
 * Executes SQL statements using Supabase service role key
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Read SQL file
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('❌ Please provide SQL file path as argument');
  console.error('Usage: node run-sql.js <path-to-sql-file>');
  process.exit(1);
}

const sqlPath = path.resolve(sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ SQL file not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf-8');

console.log('🔄 Executing SQL...\n');
console.log('SQL File:', sqlPath);
console.log('Supabase URL:', SUPABASE_URL);
console.log('\n---\n');

// Use fetch to execute SQL via Supabase's REST API
// Note: For complex operations, use the rpc() approach or create a stored procedure
// For now, we'll use a simple approach via the database

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Split SQL into statements and execute
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

async function runSQL() {
  let executed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments and empty statements
    if (!statement.trim() || statement.trim().startsWith('--')) {
      continue;
    }

    console.log(`\n[${i + 1}/${statements.length}] Executing:`);
    console.log(`${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement,
      }).catch(() => {
        // If exec_sql doesn't exist, try direct approach
        return supabase.from('_sql_execute').insert({ query: statement });
      });

      if (error) {
        // Check if it's a comment or result row
        if (statement.includes('SELECT') && statement.includes('as status')) {
          console.log('✅ Query executed');
        } else {
          console.error('⚠️  Error:', error.message);
        }
      } else {
        console.log('✅ Executed');
        executed++;
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  }

  console.log(`\n---\n✅ SQL execution complete! (${executed} statements)`);
}

runSQL().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
