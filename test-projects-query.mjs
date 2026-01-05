import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testProjectsQuery() {
  console.log('Testing projects query...\n')
  
  // Test basic query
  const { data, error } = await supabase
    .from('projects')
    .select('id,name,status,client_id')
    .limit(5)
  
  if (error) {
    console.log('❌ Error:', error)
  } else {
    console.log('✅ Basic query works, found:', data?.length || 0, 'projects')
    console.log('Sample:', JSON.stringify(data?.[0], null, 2))
  }
  
  // Test with join
  const { data: data2, error: error2 } = await supabase
    .from('projects')
    .select('id,name,status,client_id,clients(company_name)')
    .limit(5)
  
  if (error2) {
    console.log('\n❌ Join query failed:', error2.message)
  } else {
    console.log('\n✅ Join query works')
    console.log('Sample:', JSON.stringify(data2?.[0], null, 2))
  }
}

testProjectsQuery()
