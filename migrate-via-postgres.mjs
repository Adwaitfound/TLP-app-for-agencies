import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

dotenv.config({ path: '.env.local' })

const { Pool } = pg

async function runMigrationViaPostgres() {
  let pool = null
  try {
    console.log('🔄 Connecting to PostgreSQL directly...\n')
    
    // Extract connection details from Supabase URL
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const projectId = url.hostname.split('.')[0]
    
    // Create connection pool
    pool = new Pool({
      host: `db.${projectId}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ssl: true,
    })
    
    const client = await pool.connect()
    
    try {
      console.log('✅ Connected to database')
      
      // Run migrations
      console.log('Running SQL migrations...\n')
      
      await client.query(`
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;
      `)
      console.log('   ✓ Added shared_with_client column')
      
      await client.query(`
        UPDATE invoices 
        SET shared_with_client = true 
        WHERE shared_with_client IS NULL;
      `)
      console.log('   ✓ Updated existing invoices')
      
      // Verify
      const result = await client.query(`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN shared_with_client THEN 1 ELSE 0 END) as shared
        FROM invoices;
      `)
      
      console.log('\n✅ Migration completed successfully!')
      console.log(`   Total invoices: ${result.rows[0].total}`)
      console.log(`   Shared with client: ${result.rows[0].shared || 0}`)
      
    } finally {
      client.release()
    }
    
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      console.error('❌ Authentication failed - the service role key may not be a database password')
      console.log('\nPlease add the column manually in Supabase Dashboard:')
      showInstructions()
    } else if (err.message.includes('column')) {
      console.log('✅ Column already exists!')
    } else {
      console.error('❌ Error:', err.message)
      showInstructions()
    }
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

function showInstructions() {
  console.log('\n1. Go to https://app.supabase.com')
  console.log('2. Select project: frinqtylwgzquoxvqhxb')
  console.log('3. Go to SQL Editor')
  console.log('4. Create a new query and run:\n')
  console.log(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;`)
  console.log(`UPDATE invoices SET shared_with_client = true WHERE shared_with_client IS NULL;`)
}

runMigrationViaPostgres()
