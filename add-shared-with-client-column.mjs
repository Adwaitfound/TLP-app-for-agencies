import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addSharedWithClientColumn() {
  console.log('Adding shared_with_client column to invoices table...\n')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;
    `
  }).catch(async () => {
    // If RPC doesn't work, try direct SQL
    console.log('Trying direct SQL approach...')
    const { data, error } = await supabase
      .from('invoices')
      .select('id')
      .limit(1)
    
    if (error) {
      return { error }
    }
    
    // Use PostgreSQL directly
    return await supabase.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;
    `)
  })

  if (error) {
    console.error('Error adding column:', error.message)
  } else {
    console.log('✅ Column added successfully or already exists')
  }
}

addSharedWithClientColumn()
