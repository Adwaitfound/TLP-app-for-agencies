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
    
    // Try to query it first to see if it already exists
    const { data: test, error: testError } = await supabase
      .from('invoices')
      .select('id, shared_with_client')
      .limit(1)
    
    if (test && test.length > 0 && !testError) {
      console.log('✅ Column already exists in invoices table')
      return
    }
    
    if (testError && testError.code === '42703') {
      console.log('Column missing, attempting to add...')
      
      // Try using exec_sql RPC
      try {
        const { data, error: rpcError } = await supabase
          .rpc('exec_sql', {
            sql: `
              ALTER TABLE public.invoices
              ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;
              UPDATE public.invoices SET shared_with_client = true WHERE shared_with_client IS NULL;
            `
          })
        
        if (rpcError) {
          console.log('RPC not available:', rpcError.message)
          console.log('\n⚠️  Please add the column manually in Supabase Dashboard:')
          console.log('   ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;')
          console.log('   UPDATE invoices SET shared_with_client = true WHERE shared_with_client IS NULL;')
        } else {
          console.log('✅ Column added successfully via RPC')
        }
      } catch (rpcErr) {
        console.log('\n⚠️  Unable to add column via RPC')
        console.log('Please add manually in Supabase SQL Editor:')
        console.log('   ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;')
        console.log('   UPDATE invoices SET shared_with_client = true WHERE shared_with_client IS NULL;')
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message)
  }
}

addColumn()
