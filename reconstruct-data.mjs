import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env vars manually
const envContent = readFileSync('.env.production.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeOrphanedData() {
  console.log('🔍 Analyzing orphaned data...\n');

  // Get sub_projects
  const { data: subProjects } = await supabase
    .from('sub_projects')
    .select('*');
  
  // Get employee_tasks
  const { data: employeeTasks } = await supabase
    .from('employee_tasks')
    .select('*');

  // Get chat_messages
  const { data: chatMessages } = await supabase
    .from('chat_messages')
    .select('*')
    .limit(10);

  console.log(`📊 Found:`);
  console.log(`  - ${subProjects?.length || 0} sub_projects`);
  console.log(`  - ${employeeTasks?.length || 0} employee_tasks`);
  console.log(`  - Chat messages exist\n`);

  // Analyze sub_projects for project info
  if (subProjects?.length) {
    console.log('=== SUB_PROJECTS SAMPLE ===');
    console.log(JSON.stringify(subProjects.slice(0, 3), null, 2));
  }

  // Analyze employee_tasks for project info
  if (employeeTasks?.length) {
    console.log('\n=== EMPLOYEE_TASKS SAMPLE ===');
    console.log(JSON.stringify(employeeTasks.slice(0, 3), null, 2));
    
    // Check for proposed project names
    const proposedProjects = employeeTasks.filter(t => t.proposed_project_name);
    if (proposedProjects.length) {
      console.log(`\n📋 Found ${proposedProjects.length} proposed projects in employee_tasks`);
    }
  }

  // Extract unique project IDs
  const projectIds = new Set([
    ...subProjects.map(sp => sp.project_id).filter(Boolean),
    ...employeeTasks.map(et => et.project_id).filter(Boolean)
  ]);

  console.log(`\n🔑 Unique project_ids referenced: ${projectIds.size}`);
  console.log(Array.from(projectIds).slice(0, 10));
}

analyzeOrphanedData().catch(console.error);
