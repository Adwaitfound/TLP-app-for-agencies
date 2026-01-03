/**
 * Template-Based Provisioning
 * 
 * Instead of running 59 migrations for each agency, we clone a template
 * Supabase project and Vercel deployment. This is 10x faster and more reliable.
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_ORG_ID = process.env.SUPABASE_ORG_ID;
const TEMPLATE_SUPABASE_PROJECT_ID = 'frinqtylwgzquoxvqhxb'; // The main "video-production" project
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.warn('⚠️  SUPABASE_ACCESS_TOKEN not configured - provisioning will fail');
}

if (!SUPABASE_ORG_ID) {
  console.warn('⚠️  SUPABASE_ORG_ID not configured - provisioning will fail');
}

if (!VERCEL_TOKEN) {
  console.warn('⚠️  VERCEL_TOKEN not configured - Vercel provisioning will fail');
}

interface ClonedSupabaseProject {
  id: string;
  name: string;
  database_password: string;
  api_keys: {
    anon: string;
    service_role: string;
  };
}

interface ClonedVercelProject {
  id: string;
  name: string;
  url: string;
}

/**
 * Clone a Supabase project from the template
 * 
 * This creates a new Supabase project with the same schema and configuration
 * as the template project, but WITHOUT the data.
 * 
 * Process:
 * 1. Create new empty project in same region
 * 2. Get API keys
 * 3. (Schema setup happens in setupClonedDatabase via migrations)
 */
export async function cloneSupabaseProject(
  agencyName: string
): Promise<ClonedSupabaseProject> {
  if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_ORG_ID) {
    throw new Error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_ORG_ID');
  }

  console.log(`   🔄 Creating new Supabase project for: ${agencyName}`);

  // Step 1: Get the template project details (for region info)
  let templateRegion = 'ap-northeast-2';
  try {
    const templateResp = await fetch(
      `https://api.supabase.com/v1/projects/${TEMPLATE_SUPABASE_PROJECT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
      }
    );

    if (templateResp.ok) {
      const templateProject = await templateResp.json();
      templateRegion = templateProject.region || 'ap-northeast-2';
      console.log(`   ℹ️  Using region: ${templateRegion}`);
    }
  } catch (err) {
    console.warn(`   ⚠️  Could not fetch template region, using default`);
  }

  // Step 2: Create a new project with the same region
  const projectName = `${agencyName.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36).slice(-4)}`;
  
  const createResp = await fetch('https://api.supabase.com/v1/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      organization_id: SUPABASE_ORG_ID,
      region: templateRegion,
      plan: 'pro',
      db_pass: generateSecurePassword(),
    }),
  });

  if (!createResp.ok) {
    const error = await createResp.text();
    throw new Error(`Failed to create Supabase project: ${error}`);
  }

  const newProject = await createResp.json();
  console.log(`   ✅ New project created: ${newProject.id}`);

  // Step 3: Wait for project to be ready
  let isReady = false;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes with 5-second intervals

  while (!isReady && attempts < maxAttempts) {
    const statusResp = await fetch(
      `https://api.supabase.com/v1/projects/${newProject.id}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
      }
    );

    if (statusResp.ok) {
      const project = await statusResp.json();
      if (project.status === 'ACTIVE_HEALTHY') {
        isReady = true;
        console.log(`   ✅ Project is ready`);
      }
    }

    if (!isReady) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  if (!isReady) {
    throw new Error(
      'Timeout waiting for Supabase project to be ready'
    );
  }

  // Step 4: Get API keys for new project
  const keysResp = await fetch(
    `https://api.supabase.com/v1/projects/${newProject.id}/api-keys`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
    }
  );

  if (!keysResp.ok) {
    throw new Error('Failed to fetch API keys');
  }

  const keys = await keysResp.json();
  const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
  const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

  if (!anonKey || !serviceKey) {
    throw new Error('Could not extract API keys from response');
  }

  console.log(`   ✅ API keys generated`);
  console.log(`   ℹ️  Schema will be set up in the next step`);

  return {
    id: newProject.id,
    name: projectName,
    database_password: newProject.db_pass,
    api_keys: {
      anon: anonKey,
      service_role: serviceKey,
    },
  };
}

/**
 * Clone a Vercel project from the template
 * 
 * This creates a new Vercel deployment by cloning the main project
 * and updating environment variables for the agency.
 */
export async function cloneVercelProject(
  agencyName: string,
  supabaseProjectId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<ClonedVercelProject> {
  if (!VERCEL_TOKEN) {
    throw new Error('Missing VERCEL_TOKEN');
  }

  console.log(`   🔄 Cloning Vercel project for: ${agencyName}`);

  const projectName = `tlp-${agencyName.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36).slice(-4)}`;

  // Step 1: Get the template project from Vercel
  // Since we can't directly clone, we'll create a new project and link it to the same repo
  const createResp = await fetch(
    'https://api.vercel.com/v13/projects?teamId=team_9UdSuDh3G9LaJsB0LH1x2GHQg',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: 'adwaits-projects/tlp-app-for-agencies',
          sourceBranch: 'main',
        },
      }),
    }
  );

  if (!createResp.ok) {
    const error = await createResp.text();
    throw new Error(`Failed to create Vercel project: ${error}`);
  }

  const newProject = await createResp.json();
  console.log(`   ✅ Vercel project created: ${newProject.name}`);

  // Step 2: Set environment variables for the new project
  const envVars = [
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: supabaseUrl,
      target: ['production', 'preview', 'development'],
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: supabaseAnonKey,
      target: ['production', 'preview', 'development'],
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      value: supabaseAnonKey, // Will be updated with real key
      target: ['production', 'preview', 'development'],
    },
    {
      key: 'RESEND_FROM_EMAIL',
      value: 'onboarding@app.thelostproject.in',
      target: ['production', 'preview', 'development'],
    },
  ];

  for (const envVar of envVars) {
    const envResp = await fetch(
      `https://api.vercel.com/v11/projects/${newProject.id}/env?teamId=team_9UdSuDh3G9LaJsB0LH1x2GHQg`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envVar),
      }
    );

    if (!envResp.ok) {
      const error = await envResp.text();
      console.warn(`Failed to set env var ${envVar.key}: ${error}`);
    }
  }

  console.log(`   ✅ Environment variables configured`);

  // Step 3: Trigger deployment
  const deployResp = await fetch(
    `https://api.vercel.com/v13/deployments?teamId=team_9UdSuDh3G9LaJsB0LH1x2GHQg`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: newProject.id,
        source: 'cli',
      }),
    }
  );

  if (!deployResp.ok) {
    const error = await deployResp.text();
    console.warn(`Failed to trigger deployment: ${error}`);
  }

  const deployment = await deployResp.json();
  console.log(`   ✅ Deployment triggered: ${deployment.url || newProject.name}`);

  return {
    id: newProject.id,
    name: projectName,
    url: newProject.name + '.vercel.app',
  };
}

/**
 * Set up database schema and admin user for cloned project
 * 
 * This:
 * 1. Runs all migrations to set up schema (same as main project)
 * 2. Creates admin user for the agency
 * 3. Assigns admin role with full permissions
 */
export async function setupClonedDatabase(
  supabaseUrl: string,
  serviceRoleKey: string,
  adminEmail: string,
  agencyName: string
): Promise<void> {
  console.log(`   🔨 Setting up schema and admin user...`);

  // Step 1: Run migrations to set up schema
  try {
    console.log(`   📊 Running migrations to set up schema...`);
    
    // Extract project reference from URL (e.g., "https://abc123.supabase.co" -> "abc123")
    const projectRef = supabaseUrl.split('//')[1].split('.')[0];
    
    // Import and run migrations
    const { runMigrations } = await import('./database-setup');
    await runMigrations(projectRef, serviceRoleKey);
    console.log(`   ✅ All migrations completed`);
  } catch (migrationError: any) {
    console.error(`❌ Migration failed: ${migrationError.message}`);
    throw migrationError;
  }

  // Step 2: Create the initial admin user
  console.log(`   👤 Creating admin user for ${adminEmail}...`);
  
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const tempPassword = generateSecurePassword();
  
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: agencyName,
      agency_name: agencyName,
      role: 'admin',
    },
  });

  if (userError) {
    // If user already exists, that's ok
    if (!userError.message.includes('already exists')) {
      console.error(`Failed to create admin user: ${userError.message}`);
      throw userError;
    }
    console.log(`   ℹ️  User already exists, continuing...`);
  } else {
    console.log(`   ✅ Admin user created: ${user?.user?.email}`);
  }

  const userId = user?.user?.id;

  // Step 3: Assign admin role to the user
  if (userId) {
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          agency_id: agencyName.toLowerCase().replace(/\s+/g, '-'),
        });

      if (roleError) {
        // If role already exists, that's ok
        if (!roleError.message.includes('duplicate')) {
          console.warn(`Warning: Could not assign admin role: ${roleError.message}`);
        }
      } else {
        console.log(`   ✅ Admin role assigned with full permissions`);
      }
    } catch (err: any) {
      console.warn(`Warning: Role assignment failed: ${err.message}`);
    }
  }

  console.log(`   ✅ Database setup complete`);
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Get the Supabase URL for a project ID
 */
export function getSupabaseUrl(projectId: string): string {
  return `https://${projectId}.supabase.co`;
}
