import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env vars
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

async function reconstructData() {
  console.log('🔧 Reconstructing projects and clients from orphaned data...\n');

  // Get all sub_projects to extract parent project IDs
  const { data: subProjects } = await supabase
    .from('sub_projects')
    .select('*');

  // Group by parent_project_id
  const projectGroups = {};
  subProjects.forEach(sp => {
    const pid = sp.parent_project_id;
    if (!projectGroups[pid]) {
      projectGroups[pid] = [];
    }
    projectGroups[pid].push(sp);
  });

  console.log(`📋 Found ${Object.keys(projectGroups).length} unique parent projects\n`);

  // Extract project names from sub_projects
  const projectsToCreate = Object.entries(projectGroups).map(([projectId, subs]) => {
    const firstSub = subs[0];
    // Try to infer project name from sub-project names
    const projectName = firstSub.name.split(' - ')[0] || firstSub.name.split(':')[0] || 'Recovered Project';
    
    // Use your admin user ID for all projects
    const adminUserId = '2b0756e4-8628-4e29-9a52-ab7d495e56a2';
    
    return {
      id: projectId,
      name: projectName,
      description: `Reconstructed from ${subs.length} sub-projects`,
      status: 'in_progress',
      progress_percentage: 0,
      created_by: adminUserId
    };
  });

  console.log('Projects to reconstruct:');
  projectsToCreate.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${projectGroups[p.id].length} sub-projects)`);
  });

  // Check if client already exists, otherwise create one
  console.log('\n📝 Checking for existing client...');
  let { data: existingClient } = await supabase
    .from('clients')
    .select('*')
    .limit(1)
    .single();

  let client;
  if (existingClient) {
    console.log(`✅ Using existing client: ${existingClient.company_name} (${existingClient.id})`);
    client = existingClient;
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: '2b0756e4-8628-4e29-9a52-ab7d495e56a2',
        company_name: 'Recovered Clients',
        contact_person: 'Admin',
        email: 'recovered@thelostproject.in',
        phone: '',
        address: '',
        status: 'active'
      })
      .select()
      .single();

    if (clientError) {
      console.error('❌ Error creating client:', clientError);
      return;
    }
    console.log(`✅ Created client: ${newClient.company_name} (${newClient.id})`);
    client = newClient;
  }

  // Update projects to include client_id
  const projectsWithClient = projectsToCreate.map(p => ({
    ...p,
    client_id: client.id
  }));

  // Insert projects
  console.log('\n📝 Inserting projects...');
  const { data: insertedProjects, error: projectError } = await supabase
    .from('projects')
    .insert(projectsWithClient)
    .select();

  if (projectError) {
    console.error('❌ Error creating projects:', projectError);
    return;
  }

  console.log(`✅ Created ${insertedProjects.length} projects`);

  // Update sub_projects to link to new projects
  console.log('\n🔗 Updating sub_projects references...');
  for (const project of insertedProjects) {
    const { error: updateError } = await supabase
      .from('sub_projects')
      .update({ project_id: project.id })
      .eq('parent_project_id', project.id);

    if (updateError) {
      console.error(`❌ Error updating sub_projects for ${project.name}:`, updateError);
    }
  }

  console.log('\n✅ Data reconstruction complete!');
  console.log(`\nSummary:`);
  console.log(`  - Created 1 client`);
  console.log(`  - Recreated ${insertedProjects.length} projects`);
  console.log(`  - Reconnected ${subProjects.length} sub-projects`);
}

reconstructData().catch(console.error);
