const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fixClients() {
  console.log('🔄 Fixing client user associations...\n');

  // SQL statements to execute
  const statements = [
    {
      name: 'Insert missing public.users records',
      sql: `INSERT INTO public.users (id, email, full_name, role, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)) as full_name,
  CASE 
    WHEN au.email LIKE '%@thelostproject.in' AND au.email NOT LIKE 'admin%' THEN 'client'
    ELSE COALESCE(au.raw_user_meta_data->>'role', 'client')
  END as role,
  'approved' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = CASE 
    WHEN EXCLUDED.email LIKE '%@thelostproject.in' AND EXCLUDED.email NOT LIKE 'admin%' THEN 'client'
    ELSE EXCLUDED.role
  END,
  updated_at = NOW()`
    },
    {
      name: 'Insert missing clients records',
      sql: `INSERT INTO clients (user_id, email, company_name, contact_person, status, total_projects, total_revenue, created_at, updated_at)
SELECT 
  pu.id as user_id,
  pu.email,
  COALESCE(SPLIT_PART(pu.email, '@', 1), 'Unknown Company') as company_name,
  COALESCE(pu.full_name, SPLIT_PART(pu.email, '@', 1)) as contact_person,
  'active' as status,
  0 as total_projects,
  0 as total_revenue,
  pu.created_at,
  NOW() as updated_at
FROM public.users pu
LEFT JOIN clients c ON pu.id = c.user_id
WHERE c.id IS NULL
  AND pu.role = 'client'
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  updated_at = NOW()`
    }
  ];

  for (const stmt of statements) {
    console.log(`⏳ ${stmt.name}...`);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt.sql });
      
      if (error) {
        // Function doesn't exist, try a simple query to check connection
        const { error: testError } = await supabase
          .from('public.users')
          .select('count', { count: 'exact' });
        
        if (testError) {
          console.log('❌ Cannot execute via API');
          return false;
        }
      }
      console.log(`✅ ${stmt.name}`);
    } catch (err) {
      console.log(`⚠️  ${stmt.name} - needs manual execution`);
    }
  }

  return true;
}

fixClients().then(success => {
  if (!success) {
    console.log('\n⚠️  Please execute SQL in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql/new');
  } else {
    console.log('\n✅ All fixes applied!');
  }
});
