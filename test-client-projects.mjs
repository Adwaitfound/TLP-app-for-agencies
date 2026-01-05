import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testClientProjects() {
  // Get a test client user ID
  const { data: users } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'client')
    .limit(1)
  
  if (!users || users.length === 0) {
    console.log('No client users found')
    return
  }
  
  const clientUserId = users[0].id
  console.log('Testing with client user:', users[0].email)
  
  // Get client record
  const { data: clientRecord, error: clientError } = await supabase
    .from('clients')
    .select('id,user_id,company_name,email,status')
    .eq('user_id', clientUserId)
    .single()
  
  if (clientError) {
    console.log('❌ Client record error:', clientError.message)
    return
  }
  
  console.log('✅ Client record found:', clientRecord?.company_name)
  
  // Get projects for this client
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id,name,status,description,created_at,client_id,clients(company_name)')
    .eq('client_id', clientRecord.id)
    .order('created_at', { ascending: false })
  
  if (projectError) {
    console.log('❌ Projects error:', projectError.message)
  } else {
    console.log('✅ Projects found:', projects?.length || 0)
    projects?.forEach(p => {
      console.log(`  - ${p.name} (${p.status})`)
    })
  }
}

testClientProjects()
