import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function runSQL() {
  try {
    console.log('🔄 Executing SQL via Supabase API...\n')
    
    const sql = `
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;
      UPDATE invoices SET shared_with_client = true WHERE shared_with_client IS NULL;
    `
    
    // Use Supabase's internal SQL endpoint
    const response = await fetch(`${url}/rest/v1/rpc/q`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        query: sql
      })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Migration completed successfully!')
      console.log('   - Added shared_with_client column to invoices table')
      console.log('   - Set all existing invoices to shared_with_client = true')
    } else {
      console.error('❌ Error:', data.message || JSON.stringify(data))
      console.log('\nFalling back to manual instructions...')
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message)
    console.log('\n⚠️  Please add the column manually:')
    console.log('1. Go to https://app.supabase.com')
    console.log('2. Select project: frinqtylwgzquoxvqhxb')
    console.log('3. Go to SQL Editor')
    console.log('4. Run:\n')
    console.log('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;')
    console.log('UPDATE invoices SET shared_with_client = true WHERE shared_with_client IS NULL;')
  }
}

runSQL()
