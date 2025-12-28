import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://frinqtylwgzquoxvqhxb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6cXVveHZxaHhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDc2OTM3NywiZXhwIjoyMDUwMzQ1Mzc3fQ.k4oF6Y30VyNn8fN6VhY3Hc4W-hbhAZ3YQSy9P-yWXjY';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

async function executeSql() {
  console.log('🚀 Executing SETUP_CHAT.sql...\n');

  const sql = fs.readFileSync('SETUP_CHAT.sql', 'utf8');
  
  // Split by semicolons but keep DO blocks together
  const statements = sql
    .split(/;(?!\s*END\s*\$\$)/i)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip pure comment lines
    if (statement.replace(/\s/g, '') === ';') continue;
    
    console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);
    console.log(statement.substring(0, 100) + '...\n');
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_string: statement 
      });
      
      if (error) {
        // Try direct execution
        const response = await fetch(
          `${supabaseUrl}/rest/v1/rpc/exec_sql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ sql_string: statement }),
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        console.log('✅ Success (via RPC)');
        successCount++;
      } else {
        console.log('✅ Success');
        successCount++;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      errorCount++;
      
      // Continue with next statement
      console.log('⏭️  Continuing with next statement...');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${statements.length}\n`);
}

executeSql().catch(console.error);
