import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCompanyName() {
  console.log('Checking company_name for avani@thelostproject.in...\n')
  
  // Check users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name, company_name, role')
    .eq('email', 'avani@thelostproject.in')
    .single()
  
  if (userError) {
    console.log('User error:', userError.message)
  } else {
    console.log('Users table:')
    console.log(JSON.stringify(userData, null, 2))
  }
  
  // Check clients table
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('id, user_id, company_name, contact_person, email')
    .eq('email', 'avani@thelostproject.in')
    .single()
  
  if (clientError) {
    console.log('\nClient error:', clientError.message)
  } else {
    console.log('\nClients table:')
    console.log(JSON.stringify(clientData, null, 2))
  }
}

checkCompanyName()
