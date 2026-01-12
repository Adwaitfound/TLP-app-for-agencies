const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)[1];

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = `${supabaseUrl}/rest/v1/rpc/exec`;
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          resolve({ success: false, error: data });
        }
      });
    });
    
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function runMigration() {
  console.log('📊 Starting SQL migration via Supabase REST API...\n');
  console.log('🔗 Project:', projectRef);
  console.log('🔗 URL:', supabaseUrl);
  console.log('');
  
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'saas_core_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded:', sqlPath);
    console.log('📏 File size:', sqlContent.length, 'characters\n');
    console.log('⚠️  NOTE: Supabase JS client cannot execute raw SQL');
    console.log('⚠️  Please copy the SQL file content and run it in Supabase SQL Editor\n');
    console.log('🔗 Open: https://supabase.com/dashboard/project/' + projectRef + '/sql\n');
    console.log('📋 Steps:');
    console.log('   1. Open the link above');
    console.log('   2. Copy all content from saas_core_tables.sql');
    console.log('   3. Paste into SQL editor');
    console.log('   4. Click RUN button\n');
    console.log('✅ Then run: node check-migration.js to verify\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();
