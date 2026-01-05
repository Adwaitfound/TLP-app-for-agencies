import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  try {
    console.log('🔄 Running migration to add shared_with_client column...\n')
    
    // Execute SQL directly via Supabase PostgreSQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;
        UPDATE invoices SET shared_with_client = true WHERE shared_with_client IS NULL;
      `
    })
    
    if (error) {
      console.error('❌ Error executing SQL:', error.message)
      console.log('\nTrying alternative approach...')
      
      // Try fetching to check if column exists
      const { data: invoices, error: checkError } = await supabase
        .from('invoices')
        .select('id, shared_with_client')
        .limit(1)
      
      if (!checkError) {
        console.log('✅ Column already exists! Migration not needed.')
        return
      }
      
      if (checkError.code === '42703') {
        console.error('\n⚠️  Column does not exist and cannot be added via RPC')
        console.log('\nPlease add it manually in Supabase Dashboard:')
        console.log('1. Go to https://app.supabase.com')
        console.log('2. Select project: frinqtylwgzquoxvqhxb')
        console.log('3. Go to SQL Editor')
        console.log('4. Run this query:\n')
        console.log(`
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;
  UPDATE invoices SET shared_with_client = true WHERE shared_with_client IS NULL;
        `)
        return
      }
      
      throw checkError
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('   - Added shared_with_client column to invoices table')
    console.log('   - Set all existing invoices to shared_with_client = true')
    
    // Verify the change
    const { data: verify } = await supabase
      .from('invoices')
      .select('id, shared_with_client')
      .limit(1)
    
    if (verify && verify.length > 0) {
      console.log('\n✅ Verification successful! Column is accessible.')
      console.log(`   Sample invoice: ID=${verify[0].id}, shared_with_client=${verify[0].shared_with_client}`)
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

runMigration()
