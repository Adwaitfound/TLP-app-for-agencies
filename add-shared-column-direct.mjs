import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addColumn() {
  try {
    console.log('Adding shared_with_client column to invoices table...\n')
    
    // Test if column exists
    const { data: test, error: testError } = await supabase
      .from('invoices')
      .select('id, shared_with_client')
      .limit(1)
    
    if (test && test.length > 0 && !testError) {
      console.log('✅ Column already exists!')
      return
    }
    
    if (testError?.code === '42703') {
      // Column doesn't exist, try to add it
      console.log('Column missing, creating it...')
      
      // Insert a test record with a comment about the column
      // This won't work, but let's try a different approach
      // We'll create a helper table then add the column
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT true;`
      })
      
      if (createError) {
        console.log('RPC error (expected if no exec_sql):', createError.message)
      }
    }
    
    // Check if it worked
    const { data: check, error: checkError } = await supabase
      .from('invoices')
      .select('id, shared_with_client')
      .limit(1)
    
    if (check && check.length > 0) {
      console.log('✅ shared_with_client column successfully added!')
      console.log('Sample record:', check[0])
    } else if (checkError?.code === '42703') {
      console.log('❌ Column still missing - manual intervention needed')
      console.log('\nPlease go to: https://app.supabase.com/project/frinqtylwgzquoxvqhxb/sql')
      console.log('\nAnd run this SQL:')
      console.log(`
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT true;

UPDATE public.invoices SET shared_with_client = true WHERE shared_with_client IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_shared_with_client 
ON public.invoices(shared_with_client) 
WHERE shared_with_client = true;
      `)
    }
    
  } catch (err) {
    console.error('Error:', err.message)
  }
}

addColumn()
